"use client";

import { GlobalOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n/locale";

export function LocaleToggle() {
  const { locale, setLocale, m } = useLocale();

  const toggle = () => {
    const next: Locale = locale === "zh-CN" ? "en" : "zh-CN";
    setLocale(next);
  };

  return (
    <Tooltip title={m.localeAria}>
      <Button
        type="text"
        icon={<GlobalOutlined />}
        onClick={toggle}
        aria-label={m.localeAria}
      />
    </Tooltip>
  );
}
