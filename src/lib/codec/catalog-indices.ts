/**
 * 编解码下标表
 *
 * 实体用稳定 `codecIndex`（只追加）。
 *
 * | 实体 | codecIndex 来源 |
 * |------|----------------|
 * | 角色 | `characters.json` 各条目 `codecIndex` |
 * | trait | `traits.json` 各条目 `codecIndex` + 全局专属固定号 |
 * | 祝福 | `wrightstones.json` 各条目 `codecIndex` |
 * | 武器定位 | 下方 `WEAPON_TYPES` 固定序 |
 *
 * 排序/插入展示位置不升版本；追加新实体取 max+1 并升 catalogVersion。
 * 删除或改号为破坏性变更。
 */
import { catalog } from "@/lib/catalog";
import type { WeaponType } from "@/lib/schema/catalog";
import {
  EXCLUSIVE_TRAIT_CODEC_INDEX,
  EXCLUSIVE_TRAIT_SLOTS,
  exclusiveTraitId,
} from "@/lib/schema/exclusive-traits";

function buildCodecMaps(
  entries: ReadonlyArray<{ id: string; codecIndex: number }>,
): {
  idsByIndex: Array<string | undefined>;
  indexById: Map<string, number>;
} {
  let max = -1;
  for (const entry of entries) {
    if (entry.codecIndex > max) max = entry.codecIndex;
  }
  const idsByIndex: Array<string | undefined> = Array.from(
    { length: max + 1 },
    () => undefined,
  );
  const indexById = new Map<string, number>();
  for (const entry of entries) {
    if (idsByIndex[entry.codecIndex] !== undefined) {
      throw new Error(
        `duplicate codecIndex ${entry.codecIndex}: ${idsByIndex[entry.codecIndex]} vs ${entry.id}`,
      );
    }
    if (indexById.has(entry.id)) {
      throw new Error(`duplicate codec id: ${entry.id}`);
    }
    idsByIndex[entry.codecIndex] = entry.id;
    indexById.set(entry.id, entry.codecIndex);
  }
  return { idsByIndex, indexById };
}

const characterEntries = Object.entries(catalog.characters).map(([id, def]) => ({
  id,
  codecIndex: def.codecIndex,
}));
const characterMaps = buildCodecMaps(characterEntries);
export const CHARACTER_IDS = characterMaps.idsByIndex;

const traitEntries = [
  ...catalog.traits.map((trait) => ({
    id: trait.id,
    codecIndex: trait.codecIndex,
  })),
  ...EXCLUSIVE_TRAIT_SLOTS.map((slot) => ({
    id: exclusiveTraitId(slot),
    codecIndex: EXCLUSIVE_TRAIT_CODEC_INDEX[slot],
  })),
];
const traitMaps = buildCodecMaps(traitEntries);
export const TRAIT_IDS = traitMaps.idsByIndex;

const wrightstoneEntries = Object.entries(catalog.wrightstones).map(
  ([id, def]) => ({
    id,
    codecIndex: def.codecIndex,
  }),
);
const wrightstoneMaps = buildCodecMaps(wrightstoneEntries);
export const WRIGHTSTONE_IDS = wrightstoneMaps.idsByIndex;

export const WEAPON_TYPES = [
  "defender",
  "executioner",
  "stinger",
  "stunner",
  "ascension",
  "terminus",
] as const satisfies readonly WeaponType[];

const weaponTypeIndex = new Map(
  WEAPON_TYPES.map((type, i) => [type, i] as const),
);

export function characterToIndex(id: string): number | undefined {
  return characterMaps.indexById.get(id);
}

export function indexToCharacter(index: number): string | undefined {
  return CHARACTER_IDS[index];
}

export function traitToIndex(id: string): number | undefined {
  return traitMaps.indexById.get(id);
}

export function indexToTrait(index: number): string | undefined {
  return TRAIT_IDS[index];
}

export function wrightstoneToIndex(id: string): number | undefined {
  return wrightstoneMaps.indexById.get(id);
}

export function indexToWrightstone(index: number): string | undefined {
  return WRIGHTSTONE_IDS[index];
}

export function weaponTypeToIndex(type: WeaponType): number {
  return weaponTypeIndex.get(type)!;
}

export function indexToWeaponType(index: number): WeaponType | null {
  if (index < 0 || index >= WEAPON_TYPES.length) return null;
  return WEAPON_TYPES[index]!;
}
