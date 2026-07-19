"use client";

import { useEffect, useMemo, useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { useLocale } from "@/components/LocaleProvider";
import {
  applyTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/components/ThemeToggle";

const primary = "#2a8fb0";

type Props = {
  children: React.ReactNode;
};

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return readStoredTheme();
}

export function AntdProvider({ children }: Props) {
  const { locale } = useLocale();
  const [mode, setMode] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === "dark" || e.newValue === "light") {
        setMode(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    const obs = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") setMode(attr);
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      obs.disconnect();
    };
  }, []);

  const antdLocale = locale === "en" ? enUS : zhCN;

  const theme = useMemo(
    () => ({
      cssVar: { key: "gbfr" },
      algorithm:
        mode === "dark"
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: primary,
        colorInfo: primary,
        fontFamily:
          "var(--font-body), 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif",
        borderRadius: 6,
      },
    }),
    [mode],
  );

  return (
    <AntdRegistry>
      <ConfigProvider
        locale={antdLocale}
        theme={theme}
        componentSize="small"
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
