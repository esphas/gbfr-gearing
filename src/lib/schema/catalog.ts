import { z } from "zod";
import { entityIdSchema, localizedNameSchema } from "./common";

export const masteryTierSchema = z.enum(["tier1", "tier2", "tier3", "ex"]);

export const slotsConfigSchema = z.object({
  sigils: z.number().int().positive(),
  skills: z.number().int().positive(),
  summons: z.number().int().positive(),
});

export const masteryPointsSchema = z.object({
  tier1: z.number().int().positive(),
  tier2: z.number().int().positive(),
  tier3: z.number().int().positive(),
  ex: z.number().int().positive(),
});

export const masteryBonusThresholdsSchema = z.object({
  tier1: z.number().int().positive(),
  tier2: z.number().int().positive(),
  tier3: z.number().int().positive(),
});

export const metaSchema = z.object({
  game: z.literal("granblue-fantasy-relink"),
  catalogVersion: z.number().int().positive(),
  localeDefault: z.enum(["zh-CN", "en"]).default("zh-CN"),
  slots: slotsConfigSchema,
  sigilDefaultLevel: z.number().int().positive().default(15),
  masteryPoints: masteryPointsSchema,
  masteryBonusThresholds: masteryBonusThresholdsSchema,
  masteryDirectionCounts: z
    .object({
      tier1: z.number().int().positive(),
      tier2: z.number().int().positive(),
      tier3: z.number().int().positive(),
      ex: z.number().int().positive(),
    })
    .default({ tier1: 4, tier2: 8, tier3: 8, ex: 10 }),
  noteMaxLength: z.number().int().positive().default(64),
});

export const weaponTypeSchema = z.enum([
  "defender",
  "executioner",
  "stinger",
  "stunner",
  "ascension",
  "terminus",
]);

export const weaponTraitSlotSchema = z.object({
  id: entityIdSchema.nullable(),
  level: z.number().int().positive(),
});

export const weaponSchema = z.object({
  name: localizedNameSchema,
  icon: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const characterWeaponsSchema = z
  .partialRecord(weaponTypeSchema, weaponSchema)
  .refine((w) => Object.keys(w).length > 0, {
    message: "至少需要一把武器",
  });

export const weaponTypeTraitsSchema = z.object({
  traits: z.array(weaponTraitSlotSchema).min(1),
  pool: z.array(entityIdSchema),
});

export const weaponTraitsFileSchema = z.object({
  defender: weaponTypeTraitsSchema,
  executioner: weaponTypeTraitsSchema,
  stinger: weaponTypeTraitsSchema,
  stunner: weaponTypeTraitsSchema,
  ascension: weaponTypeTraitsSchema,
  terminus: weaponTypeTraitsSchema,
});

/** Stable share-codec index; 0..254 (encoded as index+1 in one byte). Never renumber. */
export const codecIndexSchema = z.number().int().nonnegative().max(254);

function refineUniqueCodecIndices(
  items: ReadonlyArray<{ codecIndex: number }>,
  ctx: z.RefinementCtx,
  pathFor: (index: number) => Array<string | number>,
): void {
  const seen = new Map<number, number>();
  for (let i = 0; i < items.length; i++) {
    const codecIndex = items[i]!.codecIndex;
    const prev = seen.get(codecIndex);
    if (prev !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate codecIndex: ${codecIndex}`,
        path: pathFor(i),
      });
    } else {
      seen.set(codecIndex, i);
    }
  }
}

export const traitSchema = z.object({
  id: z.string().min(1),
  codecIndex: codecIndexSchema,
  name: localizedNameSchema,
  icon: z.string().min(1).optional(),
  maxLevel: z.number().int().positive().optional(),
  restricted: z.literal(true).optional(),
});

export const traitsFileSchema = z
  .array(traitSchema)
  .superRefine((traits, ctx) => {
    const seenIds = new Set<string>();
    for (let i = 0; i < traits.length; i++) {
      const id = traits[i]!.id;
      if (seenIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate trait id: ${id}`,
          path: [i, "id"],
        });
      }
      seenIds.add(id);
    }
    refineUniqueCodecIndices(traits, ctx, (i) => [i, "codecIndex"]);
  });

export const characterSkillSchema = z.object({
  name: localizedNameSchema,
  icon: z.string().min(1).optional(),
});

export const masteryDirectionSchema = z.object({
  name: localizedNameSchema,
});

export const exclusiveTraitDefSchema = z.object({
  name: localizedNameSchema,
  icon: z.string().min(1).optional(),
});

export const exclusiveTraitsSchema = z.object({
  awakeningA: exclusiveTraitDefSchema,
  awakeningB: exclusiveTraitDefSchema,
  warpath: exclusiveTraitDefSchema,
});

export const characterSchema = z.object({
  codecIndex: codecIndexSchema,
  name: localizedNameSchema,
  icon: z.string().min(1).optional(),
  skills: z.array(characterSkillSchema).min(1),
  weapons: characterWeaponsSchema,
  exclusiveTraits: exclusiveTraitsSchema,
  masteries: z.array(masteryDirectionSchema).length(3),
});

export const charactersFileSchema = z
  .record(z.string(), characterSchema)
  .superRefine((characters, ctx) => {
    const entries = Object.entries(characters);
    refineUniqueCodecIndices(
      entries.map(([, def]) => def),
      ctx,
      (i) => [entries[i]![0], "codecIndex"],
    );
  });

export const wrightstoneSchema = z.object({
  codecIndex: codecIndexSchema,
  name: localizedNameSchema,
  icon: z.string().min(1).optional(),
  traits: z.array(weaponTraitSlotSchema).length(3),
});

export const wrightstonesFileSchema = z
  .record(z.string(), wrightstoneSchema)
  .superRefine((wrightstones, ctx) => {
    const entries = Object.entries(wrightstones);
    refineUniqueCodecIndices(
      entries.map(([, def]) => def),
      ctx,
      (i) => [entries[i]![0], "codecIndex"],
    );
  });

export const catalogSchema = z.object({
  meta: metaSchema,
  characters: charactersFileSchema,
  weaponTraits: weaponTraitsFileSchema,
  wrightstones: wrightstonesFileSchema,
  traits: traitsFileSchema,
});

export type MasteryTier = z.infer<typeof masteryTierSchema>;
export type SlotsConfig = z.infer<typeof slotsConfigSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type CharacterDef = z.infer<typeof characterSchema>;
export type Character = CharacterDef & { id: string };
export type ExclusiveTraitDef = z.infer<typeof exclusiveTraitDefSchema>;
export type ExclusiveTraits = z.infer<typeof exclusiveTraitsSchema>;
export type WeaponType = z.infer<typeof weaponTypeSchema>;
export type WeaponTraitSlot = z.infer<typeof weaponTraitSlotSchema>;
export type WeaponDef = z.infer<typeof weaponSchema> & { type: WeaponType };
export type WeaponTypeTraits = z.infer<typeof weaponTypeTraitsSchema>;
export type WeaponTraitsFile = z.infer<typeof weaponTraitsFileSchema>;
export type Weapon = WeaponDef & {
  id: string;
  characterId: string;
  traits: WeaponTraitSlot[];
};
export type WrightstoneDef = z.infer<typeof wrightstoneSchema>;
export type Wrightstone = WrightstoneDef & { id: string };
export type Trait = z.infer<typeof traitSchema>;
export type TraitEntry = Trait;
export type CharacterSkill = z.infer<typeof characterSkillSchema>;
export type MasteryDirection = z.infer<typeof masteryDirectionSchema>;
export type MasteryTree = MasteryDirection[];
export type Catalog = z.infer<typeof catalogSchema>;
