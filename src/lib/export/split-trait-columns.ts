import type { TraitLevelRow } from "@/lib/schema/trait-totals";

export function splitTraitColumns<T extends TraitLevelRow>(
  rows: readonly T[],
  rowsPerCol: number,
): T[][] {
  if (rows.length === 0) return [];
  const per = Math.max(1, Math.floor(rowsPerCol));
  if (rows.length <= per) return [rows.slice()];
  return [rows.slice(0, per), rows.slice(per)];
}
