import { z } from "zod";
import type { SlotsConfig, Weapon, WeaponType, Wrightstone } from "./catalog";
import { weaponTypeSchema } from "./catalog";
import {
  flexibleWeaponTraitCount,
  flexibleWrightstoneTraitCount,
} from "./equipment-slots";
import type { MasteryNodeRef } from "./mastery";
import { masteryNodeKey } from "./mastery";
import { masteryTierSchema } from "./catalog";

export const BUILD_VERSIONS = [1, 2] as const;
export type BuildVersion = (typeof BUILD_VERSIONS)[number];

export function isBuildVersion(value: unknown): value is BuildVersion {
  return value === 1 || value === 2;
}

export const sigilSlotSchema = z.tuple([
  z.string().min(1).nullable(),
  z.string().min(1).nullable(),
]);

export const summonSlotSchema = z.string().nullable();

export const masteryNodeRefSchema = z.object({
  d: z.number().int().min(0).max(2),
  tier: masteryTierSchema,
  i: z.number().int().nonnegative(),
});

export const buildStateSchema = z.object({
  v: z.union([z.literal(1), z.literal(2)]),
  characterId: z.string().min(1),
  weaponType: weaponTypeSchema.nullable(),
  weaponTraitIds: z.array(z.string().nullable()),
  wrightstoneId: z.string().nullable(),
  wrightstoneTraitIds: z.array(z.string().nullable()),
  sigilSlots: z.array(sigilSlotSchema),
  skillIndices: z.array(z.number().int().nonnegative().nullable()),
  masteryNodes: z.array(masteryNodeRefSchema),
  summonSlots: z.array(summonSlotSchema),
  note: z.string().max(64).optional(),
});

export type SigilSlot = z.infer<typeof sigilSlotSchema>;
export type SummonSlot = z.infer<typeof summonSlotSchema>;
export type BuildState = z.infer<typeof buildStateSchema>;

export function emptySigilSlot(): SigilSlot {
  return [null, null];
}

export function normalizeSigilSlot(
  slot: ReadonlyArray<string | null> | null | undefined,
): SigilSlot {
  if (!slot || slot.length === 0) return emptySigilSlot();
  const t0 = typeof slot[0] === "string" && slot[0] ? slot[0] : null;
  const t1 = typeof slot[1] === "string" && slot[1] ? slot[1] : null;
  return [t0, t1];
}

export function isSigilSlotEmpty(slot: SigilSlot): boolean {
  return slot[0] == null && slot[1] == null;
}

export function emptySummonSlot(): SummonSlot {
  return null;
}

export function createEmptyBuild(
  characterId: string,
  slots: SlotsConfig,
  weapon: Weapon | null = null,
  wrightstone: Wrightstone | null = null,
  buildVersion: BuildVersion = 1,
): BuildState {
  return {
    v: buildVersion,
    characterId,
    weaponType: weapon?.type ?? null,
    weaponTraitIds: Array.from(
      { length: flexibleWeaponTraitCount(weapon) },
      () => null,
    ),
    wrightstoneId: wrightstone?.id ?? null,
    wrightstoneTraitIds: Array.from(
      { length: flexibleWrightstoneTraitCount(wrightstone) },
      () => null,
    ),
    sigilSlots: Array.from({ length: slots.sigils }, () => emptySigilSlot()),
    skillIndices: Array.from({ length: slots.skills }, () => null),
    masteryNodes: [],
    summonSlots: Array.from({ length: slots.summons }, () => emptySummonSlot()),
  };
}

export function normalizeBuildSlots(
  build: BuildState,
  slots: SlotsConfig,
  weapon: Weapon | null | undefined = null,
  wrightstone: Wrightstone | null | undefined = null,
): BuildState {
  const padWith = <T>(arr: T[], len: number, make: () => T) => {
    const next = arr.slice(0, len);
    while (next.length < len) next.push(make());
    return next;
  };

  const cleanedSigils = build.sigilSlots.map((slot) => normalizeSigilSlot(slot));

  const cleanedSummons = build.summonSlots.map((slot) => slot ?? null);

  const seen = new Set<string>();
  const masteryNodes: MasteryNodeRef[] = [];
  for (const ref of build.masteryNodes) {
    const key = masteryNodeKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    masteryNodes.push(ref);
  }

  return {
    ...build,
    weaponType: (build.weaponType ?? null) as WeaponType | null,
    weaponTraitIds: padWith(
      build.weaponTraitIds,
      flexibleWeaponTraitCount(weapon),
      () => null,
    ),
    wrightstoneTraitIds: padWith(
      build.wrightstoneTraitIds,
      flexibleWrightstoneTraitCount(wrightstone),
      () => null,
    ),
    sigilSlots: padWith(cleanedSigils, slots.sigils, emptySigilSlot),
    skillIndices: padWith(build.skillIndices, slots.skills, () => null),
    summonSlots: padWith(cleanedSummons, slots.summons, emptySummonSlot),
    masteryNodes,
    note: build.note?.slice(0, 64),
  };
}

export function withWrightstone(
  build: BuildState,
  wrightstone: Wrightstone | null,
): BuildState {
  return {
    ...build,
    wrightstoneId: wrightstone?.id ?? null,
    wrightstoneTraitIds: Array.from(
      { length: flexibleWrightstoneTraitCount(wrightstone) },
      () => null,
    ),
  };
}
