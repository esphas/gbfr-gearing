import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import {
  BuildExportCard,
  type ExportLayout,
} from "@/components/BuildExportCard";
import type { BuildState } from "@/lib/schema/build";
import type { Locale } from "@/lib/i18n/locale";
import type { UiMessages } from "@/lib/i18n/messages";

export type { ExportLayout };

export type ExportBuildImageInput = {
  build: BuildState;
  layout: ExportLayout;
  shareUrl: string;
  locale: Locale;
  m: UiMessages;
};

export function siteUrlWithoutParams(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split(/[?#]/, 1)[0] ?? url;
  }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(async (img) => {
      if (img.complete) {
        try {
          await img.decode();
        } catch {
          /* ignore decode errors */
        }
        return;
      }
      await new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

async function waitForExportReady(
  root: HTMLElement,
  timeoutMs = 3000,
): Promise<void> {
  const card = root.querySelector(".export-card");
  if (!(card instanceof HTMLElement)) return;
  if (card.getAttribute("data-export-ready") === "true") return;

  await new Promise<void>((resolve) => {
    const done = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (card.getAttribute("data-export-ready") === "true") done();
    });
    observer.observe(card, {
      attributes: true,
      attributeFilter: ["data-export-ready"],
    });
    const timer = window.setTimeout(done, timeoutMs);
    if (card.getAttribute("data-export-ready") === "true") done();
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportBuildImage(
  input: ExportBuildImageInput,
): Promise<void> {
  const qrDataUrl = await QRCode.toDataURL(input.shareUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#111111", light: "#ffffff" },
  });

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none;";
  document.body.appendChild(host);

  const reactRoot = createRoot(host);
  try {
    reactRoot.render(
      createElement(BuildExportCard, {
        build: input.build,
        layout: input.layout,
        locale: input.locale,
        m: input.m,
        qrDataUrl,
        siteUrl: siteUrlWithoutParams(input.shareUrl),
      }),
    );

    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const card = host.querySelector(".export-card");
    if (!(card instanceof HTMLElement)) {
      throw new Error("export card missing");
    }

    await waitForImages(card);
    await waitForExportReady(host);

    const dataUrl = await toPng(card, {
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: false,
    });

    downloadDataUrl(
      dataUrl,
      `gbfr-${input.build.characterId}-${input.layout}.png`,
    );
  } finally {
    reactRoot.unmount();
    host.remove();
  }
}

export async function makeExportQrDataUrl(shareUrl: string): Promise<string> {
  return QRCode.toDataURL(shareUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#111111", light: "#ffffff" },
  });
}
