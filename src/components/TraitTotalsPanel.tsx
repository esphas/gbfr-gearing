"use client";

import { displayName, getTrait, traitIconSrc } from "@/lib/catalog";
import type { TraitLevelRow } from "@/lib/schema/trait-totals";
import { useLocale } from "@/components/LocaleProvider";
import { TraitIcon } from "@/components/TraitIcon";

type Props = {
  rows: TraitLevelRow[];
  characterId: string;
};

export function TraitTotalsPanel({ rows, characterId }: Props) {
  const { locale, m } = useLocale();

  return (
    <div className="board-block trait-totals min-w-0">
      <div className="board-head">{m.traitTotals}</div>
      {rows.length === 0 ? (
        <p className="px-2 py-3 text-xs text-[var(--muted)]">{m.noTraits}</p>
      ) : (
        <ul className="trait-totals-list">
          {rows.map((row) => {
            const trait = getTrait(row.id, characterId);
            return (
              <li key={row.id} className="trait-totals-row">
                <TraitIcon
                  src={traitIconSrc(row.id, characterId)}
                  alt=""
                  size={20}
                />
                <span className="trait-totals-name">
                  {displayName(trait, row.id, locale, m)}
                </span>
                <span className="trait-totals-levels">
                  <span className="trait-totals-slv">Slv</span>
                  {row.gear > 0 ? (
                    <span className="trait-level-gear">{row.gear}</span>
                  ) : null}
                  {row.gear > 0 && row.sigil > 0 ? (
                    <span className="trait-level-plus">+</span>
                  ) : null}
                  {row.sigil > 0 ? (
                    <span className="trait-level-sigil">{row.sigil}</span>
                  ) : null}
                  {trait?.maxLevel != null ? (
                    <span className="trait-level-max">
                      (MAX {trait.maxLevel})
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
