"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { BuildExportCard, type ExportLayout } from "@/components/BuildExportCard";
import {
  exportBuildImage,
  makeExportQrDataUrl,
  siteUrlWithoutParams,
} from "@/lib/export/export-build-image";
import type { BuildState } from "@/lib/schema/build";

type Props = {
  build: BuildState;
  shareUrl: string;
};

export function SaveImageMenu({ build, shareUrl }: Props) {
  const { locale, m } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    layout: ExportLayout;
    qrDataUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const openPreview = async (layout: ExportLayout) => {
    if (!shareUrl) {
      setError(m.saveImageFailed);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const qrDataUrl = await makeExportQrDataUrl(shareUrl);
      setPreview({ layout, qrDataUrl });
      setOpen(false);
    } catch {
      setError(m.saveImageFailed);
    } finally {
      setBusy(false);
    }
  };

  const saveFromPreview = async () => {
    if (!preview || !shareUrl) {
      setError(m.saveImageFailed);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await exportBuildImage({
        build,
        layout: preview.layout,
        shareUrl,
        locale,
        m,
      });
      setPreview(null);
    } catch {
      setError(m.saveImageFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 !text-xs"
          aria-expanded={open}
          aria-controls={panelId}
          disabled={busy}
          onClick={() => {
            setError(null);
            setOpen((v) => !v);
          }}
        >
          {busy ? m.saveImageWorking : m.saveImage}
        </button>
        {open ? (
          <div
            id={panelId}
            role="dialog"
            aria-label={m.saveImage}
            className="absolute left-0 top-full z-40 mt-1 w-[8.5rem] rounded border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                className="btn-secondary !justify-start !px-2 !py-1 !text-xs"
                disabled={busy}
                onClick={() => void openPreview("landscape")}
              >
                {m.saveImageLandscape}
              </button>
              <button
                type="button"
                className="btn-secondary !justify-start !px-2 !py-1 !text-xs"
                disabled={busy}
                onClick={() => void openPreview("portrait")}
              >
                {m.saveImagePortrait}
              </button>
              {error ? (
                <span className="text-[10px] text-warn">{error}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div
          className="export-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={m.saveImagePreview}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <div className="export-preview-panel">
            <div className="export-preview-toolbar">
              <button
                type="button"
                className="btn-primary !px-2 !py-1 !text-xs"
                disabled={busy}
                onClick={() => void saveFromPreview()}
              >
                {busy ? m.saveImageWorking : m.saveImageDownload}
              </button>
              <button
                type="button"
                className="btn-secondary !px-2 !py-1 !text-xs"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                {m.saveImageClosePreview}
              </button>
            </div>
            {error ? (
              <span className="text-[10px] text-warn">{error}</span>
            ) : null}
            <div className="export-preview-scroll">
              <BuildExportCard
                build={build}
                layout={preview.layout}
                locale={locale}
                m={m}
                qrDataUrl={preview.qrDataUrl}
                siteUrl={siteUrlWithoutParams(shareUrl)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
