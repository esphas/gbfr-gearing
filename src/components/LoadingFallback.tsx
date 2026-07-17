"use client";

import { useLocale } from "@/components/LocaleProvider";

export function LoadingFallback() {
  const { m } = useLocale();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-[var(--muted)]">
      {m.loading}
    </div>
  );
}
