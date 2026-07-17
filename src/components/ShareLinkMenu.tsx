"use client";

import { useEffect, useId, useRef } from "react";
import { useLocale } from "@/components/LocaleProvider";

type Props = {
  shareUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: () => void;
  copyStatus: string | null;
  onCopy: () => void;
};

export function ShareLinkMenu({
  shareUrl,
  open,
  onOpenChange,
  onGenerate,
  copyStatus,
  onCopy,
}: Props) {
  const { m } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="btn-primary !px-2 !py-1 !text-xs"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) {
            onOpenChange(false);
            return;
          }
          onGenerate();
          onOpenChange(true);
        }}
      >
        {m.shareLink}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={m.shareLink}
          className="share-link-menu absolute left-0 top-full z-40 mt-1 w-[min(100vw-1.5rem,22rem)] rounded border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn-secondary !shrink-0 !px-2 !py-1 !text-xs"
              onClick={onCopy}
            >
              {m.shareCopy}
            </button>
            <input
              readOnly
              className="share-link-input min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-1 text-[10px] text-[var(--muted)]"
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
            {copyStatus ? (
              <span className="shrink-0 text-[10px] text-[var(--accent)]">
                {copyStatus}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
