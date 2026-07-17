/**
 * Share codec：URL `/?v=1&b=<Base64URL>`，`b` 为二进制帧。
 *
 * 帧内实体用稳定 `codecIndex`（见 `catalog-indices.ts`）：`0`=空，否则「下标+1」。
 * 解码接受 `encodedCatalogVersion <= current`（附加兼容）；更高版本拒绝。
 * 未知 trait/祝福下标降为 `null`。
 * 未知角色下标失败。
 *
 * ## 帧布局（字节序）
 *
 * | 偏移 | 长 | 字段 |
 * |------|-----|------|
 * | 0 | 1 | 魔数 `0x52`（`R`） |
 * | 1 | 1 | Build 版本（`BUILD_VERSION`） |
 * | 2 | 1 | `catalogVersion`（`meta.json`） |
 * | 3 | 1 | 角色下标 |
 * | 4 | 1 | 高 4 位：武器定位（`0`=无，`1–6`=枚举下标+1）；低 4 位：祝福（`0`=无，`1–n`=下标+1） |
 * | 5 | 2 | 武器可配 trait |
 * | 7 | 2 | 祝福可配 trait |
 * | 9 | 24 | 因子槽 ×12（每槽 2 trait） |
 * | 33 | 4 | 技能槽（角色 `skills[]` 下标+1） |
 * | 37 | 4 | 召唤石技能（trait 下标+1） |
 * | 41 | 12 | 专精位图（90 bit，LSB-first） |
 * | 53 | 1+N | 备注：`uint8` 长度 + UTF-8（最长 `meta.noteMaxLength`） |
 *
 * ## 专精位图
 *
 * 3 方向 × 每方向 30 节点：`tier1×4` + `tier2×8` + `tier3×8` + `ex×10`。
 * 全局 bit = `方向×30 + 档内偏移 + 节点下标`（对应 Build 的 `d` / `tier` / `i`）。
 *
 */
import { catalog } from "@/lib/catalog";
import type { BuildState } from "@/lib/schema/build";
import {
  BUILD_VERSION,
  buildStateSchema,
  isSigilSlotEmpty,
  normalizeSigilSlot,
} from "@/lib/schema/build";
import type { MasteryNodeRef } from "@/lib/schema/mastery";
import type { MasteryTier, WeaponType } from "@/lib/schema/catalog";
import {
  BinaryReader,
  BinaryWriter,
  bitsToBytes,
  bytesToBits,
} from "@/lib/codec/binary-buffer";
import {
  characterToIndex,
  indexToCharacter,
  indexToTrait,
  indexToWeaponType,
  indexToWrightstone,
  traitToIndex,
  weaponTypeToIndex,
  wrightstoneToIndex,
} from "@/lib/codec/catalog-indices";

const MAGIC = 0x52;
const WEAPON_TRAIT_BYTES = 2;
const WRIGHTSTONE_TRAIT_BYTES = 2;
const MASTERY_DIRECTIONS = 3;
const MASTERY_BITMAP_BITS = 90;
const MASTERY_BITMAP_BYTES = 12;

const TIER_BASE: Record<MasteryTier, number> = {
  tier1: 0,
  tier2: 4,
  tier3: 12,
  ex: 20,
};

const TIER_COUNTS: Record<MasteryTier, number> = {
  tier1: 4,
  tier2: 8,
  tier3: 8,
  ex: 10,
};

const TIER_ORDER: MasteryTier[] = ["tier1", "tier2", "tier3", "ex"];

function masteryBitIndex(ref: MasteryNodeRef): number {
  return ref.d * 30 + TIER_BASE[ref.tier] + ref.i;
}

function masteryNodesToBitmap(nodes: MasteryNodeRef[]): Uint8Array {
  const bits = Array.from({ length: MASTERY_BITMAP_BITS }, () => false);
  for (const ref of nodes) {
    if (ref.d < 0 || ref.d >= MASTERY_DIRECTIONS) continue;
    const max = TIER_COUNTS[ref.tier];
    if (ref.i < 0 || ref.i >= max) continue;
    bits[masteryBitIndex(ref)] = true;
  }
  return bitsToBytes(bits, MASTERY_BITMAP_BYTES);
}

function bitmapToMasteryNodes(bytes: Uint8Array): MasteryNodeRef[] {
  const bits = bytesToBits(bytes, MASTERY_BITMAP_BITS);
  const nodes: MasteryNodeRef[] = [];
  for (let d = 0; d < MASTERY_DIRECTIONS; d++) {
    for (const tier of TIER_ORDER) {
      const count = TIER_COUNTS[tier];
      for (let i = 0; i < count; i++) {
        if (bits[masteryBitIndex({ d, tier, i })]) {
          nodes.push({ d, tier, i });
        }
      }
    }
  }
  return nodes;
}

function padNullable<T>(values: T[], length: number, fill: T): T[] {
  const out = values.slice(0, length);
  while (out.length < length) out.push(fill);
  return out;
}

function writeTraitRef(writer: BinaryWriter, traitId: string | null): void {
  if (!traitId) {
    writer.writeU8(0);
    return;
  }
  const index = traitToIndex(traitId);
  if (index === undefined) {
    throw new Error(`unknown trait id: ${traitId}`);
  }
  writer.writeU8(index + 1);
}

function readTraitRef(reader: BinaryReader): string | null {
  const raw = reader.readU8();
  if (raw === 0) return null;
  return indexToTrait(raw - 1) ?? null;
}

function writeSkillRef(writer: BinaryWriter, skillIndex: number | null): void {
  if (skillIndex == null) {
    writer.writeU8(0);
    return;
  }
  if (!Number.isInteger(skillIndex) || skillIndex < 0 || skillIndex > 254) {
    throw new Error(`invalid skill index: ${skillIndex}`);
  }
  writer.writeU8(skillIndex + 1);
}

function readSkillRef(reader: BinaryReader): number | null {
  const raw = reader.readU8();
  if (raw === 0) return null;
  return raw - 1;
}

function encodeWeaponType(type: WeaponType | null): number {
  if (!type) return 0;
  return weaponTypeToIndex(type) + 1;
}

function decodeWeaponType(raw: number): WeaponType | null {
  if (raw === 0) return null;
  return indexToWeaponType(raw - 1);
}

function encodeWrightstoneIndex(id: string | null): number {
  if (!id) return 0;
  const index = wrightstoneToIndex(id);
  if (index === undefined) {
    throw new Error(`unknown wrightstone id: ${id}`);
  }
  return index + 1;
}

function decodeWrightstoneIndex(raw: number): string | null {
  if (raw === 0) return null;
  return indexToWrightstone(raw - 1) ?? null;
}

function encodeBinary(build: BuildState): Uint8Array {
  const { slots } = catalog.meta;
  const characterIndex = characterToIndex(build.characterId);
  if (characterIndex === undefined) {
    throw new Error(`unknown character id: ${build.characterId}`);
  }

  const writer = new BinaryWriter();
  writer.writeU8(MAGIC);
  writer.writeU8(BUILD_VERSION);
  writer.writeU8(catalog.meta.catalogVersion);
  writer.writeU8(characterIndex);

  const weaponNibble = encodeWeaponType(build.weaponType);
  const wrightstoneNibble = encodeWrightstoneIndex(build.wrightstoneId);
  writer.writeU8((weaponNibble << 4) | wrightstoneNibble);

  for (const traitId of padNullable(build.weaponTraitIds, WEAPON_TRAIT_BYTES, null)) {
    writeTraitRef(writer, traitId);
  }
  for (const traitId of padNullable(
    build.wrightstoneTraitIds,
    WRIGHTSTONE_TRAIT_BYTES,
    null,
  )) {
    writeTraitRef(writer, traitId);
  }

  const sigilSlots = padNullable(build.sigilSlots, slots.sigils, [null, null] as const).map(
    (slot) => normalizeSigilSlot(slot),
  );
  for (const slot of sigilSlots) {
    writeTraitRef(writer, isSigilSlotEmpty(slot) ? null : slot[0]);
    writeTraitRef(writer, isSigilSlotEmpty(slot) ? null : slot[1]);
  }

  for (const skillIndex of padNullable(build.skillIndices, slots.skills, null)) {
    writeSkillRef(writer, skillIndex);
  }

  for (const summonId of padNullable(build.summonSlots, slots.summons, null)) {
    writeTraitRef(writer, summonId);
  }

  writer.writeBytes(masteryNodesToBitmap(build.masteryNodes));

  const note = build.note?.slice(0, catalog.meta.noteMaxLength) ?? "";
  const noteBytes = note ? new TextEncoder().encode(note) : new Uint8Array();
  if (noteBytes.length > 255) {
    throw new Error("note too long");
  }
  writer.writeU8(noteBytes.length);
  if (noteBytes.length > 0) {
    writer.writeBytes(noteBytes);
  }

  return writer.toUint8Array();
}

function decodeBinary(bytes: Uint8Array): BuildState {
  const reader = new BinaryReader(bytes);
  const { slots } = catalog.meta;

  if (reader.readU8() !== MAGIC) {
    throw new Error("invalid magic");
  }
  if (reader.readU8() !== BUILD_VERSION) {
    throw new Error("unsupported build version");
  }
  const encodedCatalogVersion = reader.readU8();
  if (encodedCatalogVersion > catalog.meta.catalogVersion) {
    throw new Error("catalog version mismatch");
  }

  const characterId = indexToCharacter(reader.readU8());
  if (!characterId) {
    throw new Error("invalid character index");
  }

  const packed = reader.readU8();
  const weaponType = decodeWeaponType(packed >> 4);
  const wrightstoneId = decodeWrightstoneIndex(packed & 0x0f);

  const weaponTraitIds: Array<string | null> = [];
  for (let i = 0; i < WEAPON_TRAIT_BYTES; i++) {
    weaponTraitIds.push(readTraitRef(reader));
  }

  const wrightstoneTraitIds: Array<string | null> = [];
  for (let i = 0; i < WRIGHTSTONE_TRAIT_BYTES; i++) {
    wrightstoneTraitIds.push(readTraitRef(reader));
  }

  const sigilSlots = [];
  for (let i = 0; i < slots.sigils; i++) {
    sigilSlots.push(normalizeSigilSlot([readTraitRef(reader), readTraitRef(reader)]));
  }

  const skillIndices: Array<number | null> = [];
  for (let i = 0; i < slots.skills; i++) {
    skillIndices.push(readSkillRef(reader));
  }

  const summonSlots: Array<string | null> = [];
  for (let i = 0; i < slots.summons; i++) {
    summonSlots.push(readTraitRef(reader));
  }

  const masteryNodes = bitmapToMasteryNodes(reader.readBytes(MASTERY_BITMAP_BYTES));

  const noteLen = reader.readU8();
  let note: string | undefined;
  if (noteLen > 0) {
    note = new TextDecoder().decode(reader.readBytes(noteLen));
  }
  if (reader.remaining > 0) {
    throw new Error("trailing bytes in payload");
  }

  return {
    v: BUILD_VERSION,
    characterId,
    weaponType,
    weaponTraitIds,
    wrightstoneId,
    wrightstoneTraitIds,
    sigilSlots,
    skillIndices,
    masteryNodes,
    summonSlots,
    ...(note ? { note } : {}),
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(payload: string): Uint8Array {
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function encodeBuild(build: BuildState): string {
  return bytesToBase64Url(encodeBinary(build));
}

export type DecodeResult =
  | { ok: true; build: BuildState }
  | { ok: false; code: "invalid" | "validate" | "parse" };

export function decodeBuild(payload: string): DecodeResult {
  try {
    const bytes = base64UrlToBytes(payload);
    const build = decodeBinary(bytes);
    const validated = buildStateSchema.safeParse(build);
    if (!validated.success) {
      return { ok: false, code: "validate" };
    }
    return { ok: true, build: validated.data };
  } catch {
    return { ok: false, code: "parse" };
  }
}

export function buildShareSearchParams(build: BuildState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("v", String(BUILD_VERSION));
  params.set("b", encodeBuild(build));
  return params;
}

export type ShareParseResult =
  | { kind: "empty" }
  | {
      kind: "error";
      code: "unsupported_version" | "missing_build" | "invalid" | "validate" | "parse";
      detail?: string | null;
    }
  | { kind: "build"; build: BuildState };

export function parseShareSearchParams(
  params: URLSearchParams,
): ShareParseResult {
  const v = params.get("v");
  const b = params.get("b");
  if (!v && !b) {
    return { kind: "empty" };
  }
  if (v !== String(BUILD_VERSION)) {
    return { kind: "error", code: "unsupported_version", detail: v };
  }
  if (!b) {
    return { kind: "error", code: "missing_build" };
  }
  const decoded = decodeBuild(b);
  if (!decoded.ok) {
    return { kind: "error", code: decoded.code };
  }
  return { kind: "build", build: decoded.build };
}
