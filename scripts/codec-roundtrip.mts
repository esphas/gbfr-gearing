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
import {
  decodeBuild,
  encodeBuild,
  shareBuildVersionForCharacter,
} from "../src/lib/codec/build-codec";

function roundtripForCharacter(characterId: string): void {
  const weapon = getWeaponForCharacter(characterId, "defender");
  const wrightstone = getWrightstone("vitality")!;
  const charSkills = characterSkillsFor(characterId);
  const version = shareBuildVersionForCharacter(characterId);

  let build = createEmptyBuild(
    characterId,
    catalog.meta.slots,
    weapon ?? null,
    wrightstone,
    version,
  );
  build = {
    ...build,
    weaponType: weapon?.type ?? null,
    weaponTraitIds: weapon ? ["greater-aegis", "regen"] : [],
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
      ...(version === 2
        ? ([
            { d: 0, tier: "ex", i: 10 },
            { d: 1, tier: "ex", i: 13 },
          ] as const)
        : []),
    ],
    summonSlots: ["atk", "hp", "critical-hit-rate", null],
    note: `v${version} roundtrip`,
  };

  build = normalizeBuildSlots(build, catalog.meta.slots, weapon, wrightstone);

  const encoded = encodeBuild(build);
  const decoded = decodeBuild(encoded);
  if (!decoded.ok) {
    console.error(`[${characterId}] DECODE FAILED`, decoded.code);
    process.exit(1);
  }
  if (decoded.build.v !== version) {
    console.error(
      `[${characterId}] VERSION MISMATCH`,
      decoded.build.v,
      "expected",
      version,
    );
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
    console.error(`[${characterId}] ROUNDTRIP MISMATCH`);
    console.error(encoded);
    console.error(again);
    process.exit(1);
  }

  if (version === 2) {
    const keys = new Set(
      decoded.build.masteryNodes.map((n) => `${n.d}:${n.tier}:${n.i}`),
    );
    if (!keys.has("0:ex:10") || !keys.has("1:ex:13")) {
      console.error(`[${characterId}] missing extended EX nodes`, keys);
      process.exit(1);
    }
  }

  console.log(`OK ${characterId} v${version} length=${encoded.length}`);
}

const nonCaptain = allCharacters().find((c) => c.id !== "captain")!;
roundtripForCharacter(nonCaptain.id);
roundtripForCharacter("captain");

// captain can decode a v1-shaped payload (simulate old share): encode as if v1 by
// temporarily using a non-captain layout is hard; instead decode soft catalogVersion.
const rawV1 = Buffer.from(
  encodeBuild(
    createEmptyBuild(
      nonCaptain.id,
      catalog.meta.slots,
      null,
      null,
      1,
    ),
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/"),
  "base64",
);
const older = Uint8Array.from(rawV1);
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

console.log("OK catalogVersion=", catalog.meta.catalogVersion);
console.log("OK soft catalogVersion decode");
