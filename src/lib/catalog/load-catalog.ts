import { catalogSchema, type Catalog, type Trait } from "@/lib/schema/catalog";

import meta from "../../../data/meta.json";
import characters from "../../../data/characters.json";
import weaponTraits from "../../../data/weapon-traits.json";
import wrightstones from "../../../data/wrightstones.json";
import traits from "../../../data/traits.json";

const raw = {
  meta,
  characters,
  weaponTraits,
  wrightstones,
  traits,
};

export function loadCatalog(): Catalog {
  const result = catalogSchema.safeParse(raw);
  if (!result.success) {
    console.error(result.error.flatten());
    throw new Error("Catalog 数据校验失败，请检查 data/*.json");
  }
  return result.data;
}

export function traitMapFromCatalog(
  catalog: Catalog,
): Map<string, Trait> {
  return new Map(catalog.traits.map((trait) => [trait.id, trait]));
}

export function assertWeaponTraitRefs(catalog: Catalog): void {
  const traitsById = traitMapFromCatalog(catalog);
  const missing: string[] = [];
  for (const [type, entry] of Object.entries(catalog.weaponTraits)) {
    for (const id of entry.pool) {
      if (!traitsById.has(id)) missing.push(`${type}/pool/${id}`);
    }
    for (const slot of entry.traits) {
      if (slot.id && !traitsById.has(slot.id)) {
        missing.push(`${type}/traits/${slot.id}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `unknown trait refs in weapon-traits: ${missing.join(", ")}`,
    );
  }
}
