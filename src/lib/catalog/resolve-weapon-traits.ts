import type {
  Catalog,
  WeaponTraitSlot,
  WeaponType,
  WeaponTypeTraits,
} from "@/lib/schema/catalog";

export function resolveWeaponTypeTraits(
  catalog: Catalog,
  characterId: string,
  type: WeaponType,
): WeaponTypeTraits {
  const common = catalog.weaponTraits.common[type];
  const override = catalog.characters[characterId]?.weapons[type];
  const traits: WeaponTraitSlot[] = override?.traits ?? common.traits;
  const pool = override?.pool
    ? sortPoolByTraitOrder(
        catalog,
        unionIds(common.pool, override.pool),
      )
    : common.pool;
  return { traits, pool };
}

function unionIds(
  base: readonly string[],
  extra: readonly string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of base) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of extra) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** 按 traits.json 定义顺序排序；未知 id 靠后并保持相对顺序 */
function sortPoolByTraitOrder(
  catalog: Catalog,
  pool: readonly string[],
): string[] {
  const order = new Map(
    catalog.traits.map((trait, index) => [trait.id, index] as const),
  );
  return [...pool].sort((a, b) => {
    const ai = order.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bi = order.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return 0;
  });
}
