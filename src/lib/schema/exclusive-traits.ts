import type { LocalizedName } from "@/lib/i18n/locale";

export const EXCLUSIVE_TRAIT_MAX_LEVEL = 15;

export const EXCLUSIVE_TRAIT_SLOTS = [
  "awakeningA",
  "awakeningB",
  "warpath",
] as const;

export type ExclusiveTraitSlot = (typeof EXCLUSIVE_TRAIT_SLOTS)[number];

export const EXCLUSIVE_TRAIT_CODEC_INDEX: Record<ExclusiveTraitSlot, number> = {
  awakeningA: 106,
  awakeningB: 107,
  warpath: 108,
};

const SLOT_TO_ID: Record<ExclusiveTraitSlot, string> = {
  awakeningA: "ex-awakening-a",
  awakeningB: "ex-awakening-b",
  warpath: "ex-warpath",
};

const ID_TO_SLOT = Object.fromEntries(
  EXCLUSIVE_TRAIT_SLOTS.map((slot) => [SLOT_TO_ID[slot], slot]),
) as Record<string, ExclusiveTraitSlot>;

export function exclusiveTraitId(slot: ExclusiveTraitSlot): string {
  return SLOT_TO_ID[slot];
}

export function parseExclusiveTraitId(id: string): ExclusiveTraitSlot | null {
  return ID_TO_SLOT[id] ?? null;
}

function exclusiveTraitSearchAliases(slot: ExclusiveTraitSlot): string[] {
  const common = ["专属", "exclusive"];
  if (slot === "warpath") {
    return [...common, "战气", "warpath"];
  }
  return [...common, "觉醒", "awakening"];
}

export function exclusiveTraitSearchTexts(
  slot: ExclusiveTraitSlot,
  name: LocalizedName,
): string[] {
  const names = Object.values(name).filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  return [...exclusiveTraitSearchAliases(slot), ...names];
}
