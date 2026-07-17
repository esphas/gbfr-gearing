import type { BuildState } from "./build";
import type { Meta, Trait, Weapon, Wrightstone } from "./catalog";
import { resolveTraitSlotLevels } from "./equipment-slots";

export const SIGIL_BOOSTER_TRAIT_ID = "sigil-booster";

export type TraitLevelRow = {
  id: string;
  gear: number;
  sigil: number;
};

function add(map: Map<string, number>, id: string, level: number) {
  if (!id || level <= 0) return;
  map.set(id, (map.get(id) ?? 0) + level);
}

export function computeTraitLevelRows(
  build: BuildState,
  meta: Meta,
  traits: readonly Trait[],
  weapon: Weapon | null | undefined,
  wrightstone: Wrightstone | null | undefined,
): TraitLevelRow[] {
  const gear = new Map<string, number>();
  const yellow = new Map<string, number>();

  const weaponTraits = resolveTraitSlotLevels(
    weapon?.traits ?? [],
    build.weaponTraitIds,
  );
  let boosterLevel = 0;
  for (const { id, level } of weaponTraits) {
    add(gear, id, level);
    if (id === SIGIL_BOOSTER_TRAIT_ID) {
      boosterLevel = Math.max(boosterLevel, level);
    }
  }

  for (const { id, level } of resolveTraitSlotLevels(
    wrightstone?.traits ?? [],
    build.wrightstoneTraitIds,
  )) {
    add(gear, id, level);
  }

  const sigilDefault = meta.sigilDefaultLevel;
  const sigilInstances: string[] = [];
  for (const slot of build.sigilSlots) {
    for (const id of slot) {
      if (!id) continue;
      add(yellow, id, sigilDefault);
      sigilInstances.push(id);
    }
  }

  if (boosterLevel > 0) {
    for (const id of sigilInstances) {
      add(gear, id, boosterLevel);
    }
  }

  for (const traitId of build.summonSlots) {
    if (traitId) add(yellow, traitId, sigilDefault);
  }

  const rows: TraitLevelRow[] = [];
  const seen = new Set<string>();
  for (const { id } of traits) {
    const g = gear.get(id) ?? 0;
    const s = yellow.get(id) ?? 0;
    if (g <= 0 && s <= 0) continue;
    seen.add(id);
    rows.push({ id, gear: g, sigil: s });
  }
  for (const id of new Set([...gear.keys(), ...yellow.keys()])) {
    if (seen.has(id)) continue;
    const g = gear.get(id) ?? 0;
    const s = yellow.get(id) ?? 0;
    if (g <= 0 && s <= 0) continue;
    rows.push({ id, gear: g, sigil: s });
  }
  return rows;
}
