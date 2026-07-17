import {
  assertWeaponTraitRefs,
  loadCatalog,
} from "../src/lib/catalog/load-catalog";
import {
  EXCLUSIVE_TRAIT_CODEC_INDEX,
  EXCLUSIVE_TRAIT_SLOTS,
  exclusiveTraitId,
} from "../src/lib/schema/exclusive-traits";
import { uiCatalog } from "../src/lib/i18n/messages";

/**
 * Catalog checks:
 * - schema (incl. unique codecIndex per entity kind)
 * - weapon trait refs
 * - exclusive trait codec indices do not collide with base traits
 *
 * Policy: codecIndex is append-only after publish — never renumber or reuse.
 */
const catalog = loadCatalog();
assertWeaponTraitRefs(catalog);

const exclusiveIndices = new Set(
  EXCLUSIVE_TRAIT_SLOTS.map((slot) => EXCLUSIVE_TRAIT_CODEC_INDEX[slot]),
);
const collisions: string[] = [];
for (const trait of catalog.traits) {
  if (exclusiveIndices.has(trait.codecIndex)) {
    collisions.push(
      `${trait.id} codecIndex=${trait.codecIndex} overlaps exclusive trait`,
    );
  }
}
if (collisions.length > 0) {
  throw new Error(`codecIndex collisions:\n${collisions.join("\n")}`);
}

const poolSizes = Object.entries(catalog.weaponTraits)
  .map(([k, v]) => `${k}:${v.pool.length}`)
  .join(", ");

const exclusiveSummary = EXCLUSIVE_TRAIT_SLOTS.map(
  (slot) =>
    `${exclusiveTraitId(slot)}:${EXCLUSIVE_TRAIT_CODEC_INDEX[slot]}`,
).join(", ");

console.log(
  `OK catalog v${catalog.meta.catalogVersion}:`,
  `${Object.keys(catalog.characters).length} characters,`,
  `weaponTraits pools [${poolSizes}],`,
  `${Object.keys(catalog.wrightstones).length} wrightstones,`,
  `${catalog.traits.length} traits,`,
  `exclusive [${exclusiveSummary}],`,
  `${Object.keys(uiCatalog).length} ui keys`,
);
