import type { BuildState } from "./build";
import type {
  MasteryDirectionCounts,
  MasteryTier,
  MasteryTree,
  Meta,
  Weapon,
} from "./catalog";
import { flexibleWeaponTraitCount } from "./equipment-slots";

export type MasteryPointBudget = {
  tier1: { used: number; max: number };
  tier2: { used: number; max: number };
  tier3: { used: number; max: number };
  ex: { used: number; max: number };
};

export type DirectionBonusState = {
  directionIndex: number;
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
  counts: { tier1: number; tier2: number; tier3: number; ex: number };
};

export type MasteryNodeRef = {
  d: number;
  tier: MasteryTier;
  i: number;
};

export function masteryNodeKey(ref: MasteryNodeRef): string {
  return `${ref.d}:${ref.tier}:${ref.i}`;
}

export function resolveMasteryDirectionCounts(
  meta: Meta,
  override?: Partial<MasteryDirectionCounts> | null,
): MasteryDirectionCounts {
  return {
    ...meta.masteryDirectionCounts,
    ...override,
  };
}

function tierNodeCount(
  counts: MasteryDirectionCounts,
  tier: MasteryTier,
): number {
  return counts[tier];
}

function isValidRef(
  tree: MasteryTree,
  ref: MasteryNodeRef,
  directionCounts: MasteryDirectionCounts,
): boolean {
  if (ref.d < 0 || ref.d >= tree.length) return false;
  const max = tierNodeCount(directionCounts, ref.tier);
  return ref.i >= 0 && ref.i < max;
}

export function computeMasteryPoints(
  tree: MasteryTree,
  selected: MasteryNodeRef[],
  meta: Meta,
  directionCounts: MasteryDirectionCounts = meta.masteryDirectionCounts,
): MasteryPointBudget {
  const used = { tier1: 0, tier2: 0, tier3: 0, ex: 0 };
  for (const ref of selected) {
    if (!isValidRef(tree, ref, directionCounts)) continue;
    used[ref.tier] += 1;
  }
  return {
    tier1: { used: used.tier1, max: meta.masteryPoints.tier1 },
    tier2: { used: used.tier2, max: meta.masteryPoints.tier2 },
    tier3: { used: used.tier3, max: meta.masteryPoints.tier3 },
    ex: { used: used.ex, max: meta.masteryPoints.ex },
  };
}

export function computeDirectionBonuses(
  tree: MasteryTree,
  selected: MasteryNodeRef[],
  meta: Meta,
  directionCounts: MasteryDirectionCounts = meta.masteryDirectionCounts,
): DirectionBonusState[] {
  const selectedKeys = new Set(
    selected
      .filter((ref) => isValidRef(tree, ref, directionCounts))
      .map(masteryNodeKey),
  );
  const thr = meta.masteryBonusThresholds;

  return tree.map((_, directionIndex) => {
    const countTier = (tier: MasteryTier) => {
      const max = tierNodeCount(directionCounts, tier);
      let n = 0;
      for (let i = 0; i < max; i++) {
        if (
          selectedKeys.has(masteryNodeKey({ d: directionIndex, tier, i }))
        ) {
          n += 1;
        }
      }
      return n;
    };

    const counts = {
      tier1: countTier("tier1"),
      tier2: countTier("tier2"),
      tier3: countTier("tier3"),
      ex: countTier("ex"),
    };
    const tier1 = counts.tier1 >= thr.tier1;
    const tier2 = tier1 && counts.tier2 >= thr.tier2;
    const tier3 = tier2 && counts.tier3 >= thr.tier3;
    return {
      directionIndex,
      tier1,
      tier2,
      tier3,
      counts,
    };
  });
}

export function withWeapon(
  build: BuildState,
  weapon: Weapon | null,
): BuildState {
  return {
    ...build,
    weaponType: weapon?.type ?? null,
    weaponTraitIds: Array.from(
      { length: flexibleWeaponTraitCount(weapon) },
      () => null,
    ),
  };
}
