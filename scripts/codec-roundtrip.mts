import {
  catalog,
  allCharacters,
  characterSkillsFor,
  getWrightstone,
  getWeaponForCharacter,
} from "../src/lib/catalog";
import {
  createEmptyBuild,
  normalizeBuildSlots,
} from "../src/lib/schema/build";
import { decodeBuild, encodeBuild } from "../src/lib/codec/build-codec";

const character = allCharacters()[0]!;
const weapon = getWeaponForCharacter(character.id, "defender")!;
const wrightstone = getWrightstone("vitality")!;
const charSkills = characterSkillsFor(character.id);

let build = createEmptyBuild(
  character.id,
  catalog.meta.slots,
  weapon,
  wrightstone,
);
build = {
  ...build,
  weaponType: weapon.type,
  weaponTraitIds: ["greater-aegis", "regen"],
  wrightstoneId: wrightstone.id,
  wrightstoneTraitIds: ["atk", "stamina"],
  sigilSlots: build.sigilSlots.map((slot, i) => {
    if (i === 0) return ["dmg-cap", "critical-hit-rate"];
    if (i === 1) return ["weak-point-dmg", "atk"];
    if (i === 2) return ["stamina", null];
    if (i === 3) return [null, "hp"];
    if (i === 4) return ["ex-awakening-a", "ex-warpath"];
    return slot;
  }),
  skillIndices: [
    ...charSkills.slice(0, catalog.meta.slots.skills).map((_, i) => i),
    ...Array(
      Math.max(0, catalog.meta.slots.skills - charSkills.length),
    ).fill(null),
  ].slice(0, catalog.meta.slots.skills) as Array<number | null>,
  masteryNodes: [
    { d: 0, tier: "tier1", i: 0 },
    { d: 0, tier: "tier1", i: 1 },
    { d: 0, tier: "tier1", i: 2 },
  ],
  summonSlots: ["atk", "hp", "critical-hit-rate", null],
  note: "v1 roundtrip",
};

build = normalizeBuildSlots(build, catalog.meta.slots, weapon, wrightstone);

const encoded = encodeBuild(build);
const decoded = decodeBuild(encoded);
if (!decoded.ok) {
  console.error("DECODE FAILED", decoded.code);
  process.exit(1);
}

const decodedWeapon = getWeaponForCharacter(
  decoded.build.characterId,
  decoded.build.weaponType,
);
const decodedWrightstone = decoded.build.wrightstoneId
  ? getWrightstone(decoded.build.wrightstoneId)
  : undefined;
const normalized = normalizeBuildSlots(
  decoded.build,
  catalog.meta.slots,
  decodedWeapon,
  decodedWrightstone,
);
const again = encodeBuild(normalized);

if (encoded !== again) {
  console.error("ROUNDTRIP MISMATCH");
  console.error(encoded);
  console.error(again);
  process.exit(1);
}

const raw = Buffer.from(
  encoded.replace(/-/g, "+").replace(/_/g, "/"),
  "base64",
);
const older = Uint8Array.from(raw);
older[2] = 0;
const toB64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
const olderDecoded = decodeBuild(toB64Url(older));
if (!olderDecoded.ok) {
  console.error("SOFT VERSION DECODE FAILED", olderDecoded.code);
  process.exit(1);
}
if (olderDecoded.build.characterId !== build.characterId) {
  console.error("SOFT VERSION CHARACTER MISMATCH");
  process.exit(1);
}

console.log("OK catalogVersion=", catalog.meta.catalogVersion);
console.log("OK soft catalogVersion decode");
console.log("OK buildVersion=1 encode length=", encoded.length);
