"use client";

import { Button } from "antd";
import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n/locale";

export function LocaleToggle() {
  const { locale, setLocale, m } = useLocale();

  const toggle = () => {
    const next: Locale = locale === "zh-CN" ? "en" : "zh-CN";
    setLocale(next);
  };

  return (
    <Button onClick={toggle} aria-label={m.localeAria} title={m.localeAria}>
      {locale === "zh-CN" ? m.localeEn : m.localeZh}
    </Button>
  );
}
