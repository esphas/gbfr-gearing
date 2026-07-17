"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BuildState } from "@/lib/schema/build";
import type { Locale } from "@/lib/i18n/locale";
import type { UiMessages } from "@/lib/i18n/messages";
import { splitTraitColumns } from "@/lib/export/split-trait-columns";
import type { TraitLevelRow } from "@/lib/schema/trait-totals";
import {
  AbilitiesBlock,
  CharacterBlock,
  getExportCardModel,
  MasterySideBySide,
  QrBlock,
  SigilsBlock,
  SummonsBlock,
  TraitRow,
  WeaponBlock,
  WrightstoneBlock,
} from "@/components/export/ExportCardParts";

const TRAIT_ROW_HEIGHT_PX = 18;

type Props = {
  build: BuildState;
  locale: Locale;
  m: UiMessages;
  qrDataUrl: string;
  siteUrl: string;
};

export function BuildExportLandscape({
  build,
  locale,
  m,
  qrDataUrl,
  siteUrl,
}: Props) {
  const model = useMemo(
    () => getExportCardModel(build, locale, m, qrDataUrl),
    [build, locale, m, qrDataUrl],
  );
  const traitSig = useMemo(
    () =>
      model.traitRows.map((r) => `${r.id}:${r.gear}:${r.sigil}`).join("|"),
    [model.traitRows],
  );
  const rightRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<TraitLevelRow[][]>([]);
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const note = build.note?.trim() ? build.note : null;

  useLayoutEffect(() => {
    const right = rightRef.current;
    if (!right) return;

    const rows = model.traitRows;
    const measure = () => {
      const H = right.getBoundingClientRect().height;
      const headH = headRef.current?.getBoundingClientRect().height ?? 24;
      const noteH = noteRef.current?.getBoundingClientRect().height ?? 0;
      const noteGap = noteH > 0 ? 4 : 0;
      const available = Math.max(0, H - noteH - noteGap - headH - 8);
      const rowsPerCol = Math.max(
        1,
        Math.floor(available / TRAIT_ROW_HEIGHT_PX),
      );
      setPanelHeight(H);
      setColumns(splitTraitColumns(rows, rowsPerCol));
      setReady(true);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(right);
    return () => ro.disconnect();
  }, [traitSig, model.traitRows, note]);

  return (
    <div
      className="export-card export-card--landscape"
      data-export-ready={ready ? "true" : "false"}
    >
      <div className="export-landscape-shell">
        <div
          className="export-landscape-totals"
          style={panelHeight != null ? { height: panelHeight } : undefined}
        >
          {note ? (
            <div className="export-landscape-note" ref={noteRef}>
              {note}
            </div>
          ) : null}
          <section className="export-block export-trait-totals-measured">
            <div className="export-block-head" ref={headRef}>
              {m.traitTotals}
            </div>
            {model.traitRows.length === 0 ? (
              <p className="export-empty">{m.noTraits}</p>
            ) : (
              <div
                className={`export-trait-cols${columns.length > 1 ? " export-trait-cols--dual" : ""}`}
              >
                {(columns.length > 0 ? columns : [model.traitRows]).map(
                  (col, colIdx) => (
                    <ul key={colIdx} className="export-trait-col">
                      {col.map((row) => (
                        <TraitRow
                          key={row.id}
                          id={row.id}
                          gear={row.gear}
                          sigil={row.sigil}
                          characterId={build.characterId}
                          locale={locale}
                          m={m}
                        />
                      ))}
                    </ul>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
        <div className="export-landscape-right" ref={rightRef}>
          <div className="export-landscape-top">
            <div className="export-landscape-mid">
              <CharacterBlock model={model} showNote={false} />
              <SigilsBlock model={model} />
            </div>
            <div className="export-landscape-mastery">
              <MasterySideBySide model={model} />
            </div>
          </div>
          <div className="export-landscape-bottom">
            <WeaponBlock model={model} />
            <WrightstoneBlock model={model} />
            <SummonsBlock model={model} />
            <AbilitiesBlock model={model} />
            <div className="export-landscape-brand">
              <div className="export-landscape-brand-text">
                <div className="export-title">{m.appTitle}</div>
                <div className="export-landscape-site-url">{siteUrl}</div>
              </div>
              <QrBlock qrDataUrl={qrDataUrl} size={64} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
