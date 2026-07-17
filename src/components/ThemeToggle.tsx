"use client";

import { useEffect, useState } from "react";
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

export function ThemeToggle() {
  const { m } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const next = readStoredTheme();
    setTheme(next);
    applyTheme(next);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      className="btn-secondary !px-2 !py-1 !text-xs"
      onClick={toggle}
      aria-label={isLight ? m.themeAriaDark : m.themeAriaLight}
      title={isLight ? m.themeToDark : m.themeToLight}
    >
      {isLight ? m.themeDark : m.themeLight}
    </button>
  );
}
