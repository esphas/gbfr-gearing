import type { Weapon, WeaponTraitSlot, Wrightstone } from "./catalog";

export function flexibleTraitSlotCount(
  equipment: { traits: WeaponTraitSlot[] } | null | undefined,
): number {
  if (!equipment) return 0;
  return equipment.traits.filter((t) => t.id === null).length;
}

export function flexibleWeaponTraitCount(
  weapon: Weapon | null | undefined,
): number {
  return flexibleTraitSlotCount(weapon);
}

export function flexibleWrightstoneTraitCount(
  wrightstone: Wrightstone | null | undefined,
): number {
  return flexibleTraitSlotCount(wrightstone);
}

export function resolveTraitSlotLevels(
  slots: WeaponTraitSlot[],
  selectedIds: Array<string | null>,
): Array<{ id: string; level: number }> {
  const out: Array<{ id: string; level: number }> = [];
  let flex = 0;
  for (const slot of slots) {
    if (slot.id != null) {
      out.push({ id: slot.id, level: slot.level });
    } else {
      const id = selectedIds[flex] ?? null;
      flex += 1;
      if (id) out.push({ id, level: slot.level });
    }
  }
  return out;
}
