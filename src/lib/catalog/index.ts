import type {
  Catalog,
  Character,
  CharacterSkill,
  MasteryTree,
  TraitEntry,
  Weapon,
  WeaponType,
  Wrightstone,
} from "@/lib/schema/catalog";
import type { Locale, LocalizedName } from "@/lib/i18n/locale";
import {
  EXCLUSIVE_TRAIT_CODEC_INDEX,
  EXCLUSIVE_TRAIT_MAX_LEVEL,
  EXCLUSIVE_TRAIT_SLOTS,
  exclusiveTraitId,
  parseExclusiveTraitId,
  type ExclusiveTraitSlot,
} from "@/lib/schema/exclusive-traits";
import {
  assertWeaponTraitRefs,
  loadCatalog,
  traitMapFromCatalog,
} from "./load-catalog";
import {
  displayName,
  labelForName,
  PLACEHOLDER_ICON,
  resolveIcon,
  resolveTraitIconSrc,
} from "./assets";
import type { AssetCategory } from "./assets";

export {
  displayName,
  labelForName,
  PLACEHOLDER_ICON,
  resolveIcon,
  resolveTraitIconSrc,
};
export type { AssetCategory };
export {
  exclusiveTraitSearchTexts,
  parseExclusiveTraitId,
} from "@/lib/schema/exclusive-traits";

export const catalog: Catalog = loadCatalog();
assertWeaponTraitRefs(catalog);

const traitsById = traitMapFromCatalog(catalog);

export function weaponIdFor(characterId: string, type: WeaponType): string {
  return `${characterId}-${type}`;
}

function attachWeaponTraits(
  characterId: string,
  type: WeaponType,
  def: { name: LocalizedName; icon?: string; notes?: string },
): Weapon {
  return {
    ...def,
    type,
    id: weaponIdFor(characterId, type),
    characterId,
    traits: catalog.weaponTraits[type].traits,
  };
}

const characterMap = new Map<string, Character>();
for (const [id, def] of Object.entries(catalog.characters)) {
  characterMap.set(id, { id, ...def });
}

const weaponMap = new Map<string, Weapon>();
for (const [characterId, ch] of Object.entries(catalog.characters)) {
  for (const [type, def] of Object.entries(ch.weapons) as Array<
    [WeaponType, (typeof ch.weapons)[WeaponType]]
  >) {
    if (!def) continue;
    weaponMap.set(
      weaponIdFor(characterId, type),
      attachWeaponTraits(characterId, type, def),
    );
  }
}

const wrightstoneMap = new Map<string, Wrightstone>();
for (const [id, def] of Object.entries(catalog.wrightstones)) {
  wrightstoneMap.set(id, { id, ...def });
}

export function getCharacter(id: string): Character | undefined {
  return characterMap.get(id);
}

export function allCharacters(): Character[] {
  return [...characterMap.values()];
}

export function getWeapon(id: string): Weapon | undefined {
  return weaponMap.get(id);
}

export function getWeaponForCharacter(
  characterId: string,
  type: WeaponType | null | undefined,
): Weapon | undefined {
  if (!type) return undefined;
  return getWeapon(weaponIdFor(characterId, type));
}

export function getWrightstone(id: string): Wrightstone | undefined {
  return wrightstoneMap.get(id);
}

export function allWrightstones(): Wrightstone[] {
  return [...wrightstoneMap.values()];
}

function exclusiveTraitEntry(
  characterId: string,
  slot: ExclusiveTraitSlot,
): TraitEntry | undefined {
  const ch = catalog.characters[characterId];
  if (!ch) return undefined;
  const def = ch.exclusiveTraits[slot];
  return {
    id: exclusiveTraitId(slot),
    codecIndex: EXCLUSIVE_TRAIT_CODEC_INDEX[slot],
    name: def.name,
    icon: def.icon,
    maxLevel: EXCLUSIVE_TRAIT_MAX_LEVEL,
  };
}

export function getTrait(
  id: string,
  characterId?: string,
): TraitEntry | undefined {
  const slot = parseExclusiveTraitId(id);
  if (slot) {
    if (!characterId) return undefined;
    return exclusiveTraitEntry(characterId, slot);
  }
  return traitsById.get(id);
}

export function getMasteryTreeForCharacter(
  characterId: string,
): MasteryTree | undefined {
  return catalog.characters[characterId]?.masteries;
}

export function weaponsForCharacter(characterId: string): Weapon[] {
  const ch = catalog.characters[characterId];
  if (!ch) return [];
  return (
    Object.entries(ch.weapons) as Array<
      [WeaponType, (typeof ch.weapons)[WeaponType]]
    >
  )
    .filter(
      (entry): entry is [WeaponType, NonNullable<(typeof ch.weapons)[WeaponType]>] =>
        Boolean(entry[1]),
    )
    .map(([type, def]) => attachWeaponTraits(characterId, type, def));
}

export function characterSkillsFor(characterId: string): CharacterSkill[] {
  return catalog.characters[characterId]?.skills ?? [];
}

export function getCharacterSkill(
  characterId: string,
  index: number | null | undefined,
): CharacterSkill | undefined {
  if (index == null || index < 0) return undefined;
  return catalog.characters[characterId]?.skills[index];
}

export function weaponTraitPoolFor(type: WeaponType): TraitEntry[] {
  return catalog.weaponTraits[type].pool
    .map((id) => getTrait(id))
    .filter((t): t is TraitEntry => t !== undefined);
}

export function flexibleWeaponTraitOptions(
  weapon: Weapon,
  weaponTraitIds: Array<string | null>,
  flexibleIndex: number,
): TraitEntry[] {
  const occupied = new Set<string>();
  for (const slot of weapon.traits) {
    if (slot.id) occupied.add(slot.id);
  }
  weaponTraitIds.forEach((id, i) => {
    if (id && i !== flexibleIndex) occupied.add(id);
  });
  return weaponTraitPoolFor(weapon.type).filter((t) => !occupied.has(t.id));
}

export function flexibleWrightstoneTraitOptions(
  wrightstone: Wrightstone,
  characterId: string,
  wrightstoneTraitIds: Array<string | null>,
  flexibleIndex: number,
): TraitEntry[] {
  const occupied = new Set<string>();
  for (const slot of wrightstone.traits) {
    if (slot.id) occupied.add(slot.id);
  }
  wrightstoneTraitIds.forEach((id, i) => {
    if (id && i !== flexibleIndex) occupied.add(id);
  });
  return traitsForCharacter(characterId).filter((t) => !occupied.has(t.id));
}

export function traitsForCharacter(characterId: string): TraitEntry[] {
  void characterId;
  return catalog.traits.filter((t) => !t.restricted);
}

export function sigilTraitsForCharacter(characterId: string): TraitEntry[] {
  const exclusives = EXCLUSIVE_TRAIT_SLOTS.map(
    (slot) => exclusiveTraitEntry(characterId, slot)!,
  );
  return [...traitsForCharacter(characterId), ...exclusives];
}

export function resolveTraitName(
  id: string | null | undefined,
  locale: Locale,
  m?: Parameters<typeof displayName>[3],
  characterId?: string,
): string {
  if (!id) return m?.unknown ?? "Unknown";
  return displayName(getTrait(id, characterId), id, locale, m);
}

export function traitIconSrc(
  id: string | null | undefined,
  characterId?: string,
): string | null {
  if (!id) return null;
  if (characterId && parseExclusiveTraitId(id)) {
    const trait = getTrait(id, characterId);
    if (!trait) return null;
    return resolveIcon("characters", `${characterId}-trait`, trait.icon);
  }
  return resolveTraitIconSrc(id, getTrait(id, characterId)?.icon);
}

export function isSigilTraitsOkForCharacter(
  _characterId: string,
  traitIds: string[],
): boolean {
  for (const id of traitIds) {
    if (parseExclusiveTraitId(id)) continue;
    const trait = traitsById.get(id);
    if (!trait) continue;
    if (trait.restricted) return false;
  }
  return true;
}
