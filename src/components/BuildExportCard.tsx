"use client";

import type { BuildState } from "@/lib/schema/build";
import type { Locale } from "@/lib/i18n/locale";
import type { UiMessages } from "@/lib/i18n/messages";
import { BuildExportLandscape } from "@/components/export/BuildExportLandscape";
import { BuildExportPortrait } from "@/components/export/BuildExportPortrait";

export type ExportLayout = "landscape" | "portrait";

type Props = {
  build: BuildState;
  layout: ExportLayout;
  locale: Locale;
  m: UiMessages;
  qrDataUrl: string;
  siteUrl: string;
};

export function BuildExportCard({
  build,
  layout,
  locale,
  m,
  qrDataUrl,
  siteUrl,
}: Props) {
  if (layout === "landscape") {
    return (
      <BuildExportLandscape
        build={build}
        locale={locale}
        m={m}
        qrDataUrl={qrDataUrl}
        siteUrl={siteUrl}
      />
    );
  }
  return (
    <BuildExportPortrait
      build={build}
      locale={locale}
      m={m}
      qrDataUrl={qrDataUrl}
    />
  );
}
