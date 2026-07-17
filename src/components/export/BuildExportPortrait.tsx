"use client";

import {
  getCharacter,
  resolveIcon,
} from "@/lib/catalog";
import type { BuildState } from "@/lib/schema/build";
import type { Locale } from "@/lib/i18n/locale";
import type { UiMessages } from "@/lib/i18n/messages";
import { AssetIcon } from "@/components/AssetIcon";
import {
  AbilitiesBlock,
  getExportCardModel,
  MasteryStacked,
  QrBlock,
  SigilsBlock,
  SummonsBlock,
  TraitTotalsBlock,
  WeaponBlock,
  WrightstoneBlock,
} from "@/components/export/ExportCardParts";

type Props = {
  build: BuildState;
  locale: Locale;
  m: UiMessages;
  qrDataUrl: string;
};

export function BuildExportPortrait({
  build,
  locale,
  m,
  qrDataUrl,
}: Props) {
  const model = getExportCardModel(build, locale, m, qrDataUrl);
  const character = getCharacter(build.characterId);

  return (
    <div
      className="export-card export-card--portrait"
      data-export-ready="true"
    >
      <header className="export-header">
        <div className="export-header-left export-header-portrait-main">
          <div className="export-title">{m.appTitle}</div>
          <div className="export-portrait-char-inline">
            <AssetIcon
              src={resolveIcon(
                "characters",
                build.characterId,
                character?.icon,
              )}
              alt={model.characterName}
              size={36}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="export-character-name">{model.characterName}</div>
              {build.note ? (
                <div className="export-note">{build.note}</div>
              ) : null}
            </div>
          </div>
        </div>
        <QrBlock qrDataUrl={qrDataUrl} size={44} />
      </header>
      <TraitTotalsBlock model={model} />
      <SigilsBlock model={model} />
      <div className="export-portrait-equip">
        <WeaponBlock model={model} />
        <WrightstoneBlock model={model} />
        <SummonsBlock model={model} />
        <AbilitiesBlock model={model} />
      </div>
      <MasteryStacked model={model} />
    </div>
  );
}
