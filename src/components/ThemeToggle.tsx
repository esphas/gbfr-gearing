"use client";

import { useState } from "react";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useLocale } from "@/components/LocaleProvider";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "relink-theme";

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);else document.documentElement.setAttribute("data-theme","light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return "light";
}

export function ThemeToggle() {
  const { m } = useLocale();
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  const isLight = theme === "light";
  const tip = isLight ? m.themeToDark : m.themeToLight;
  const aria = isLight ? m.themeAriaDark : m.themeAriaLight;

  return (
    <Tooltip title={tip}>
      <Button
        type="text"
        icon={isLight ? <MoonOutlined /> : <SunOutlined />}
        onClick={toggle}
        aria-label={aria}
      />
    </Tooltip>
  );
}
