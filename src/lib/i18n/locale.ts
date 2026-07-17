import { z } from "zod";

export const localeSchema = z.enum(["zh-CN", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const DEFAULT_LOCALE: Locale = "zh-CN";
export const LOCALE_STORAGE_KEY = "relink-locale";

export const localizedNameSchema = z.object({
  "zh-CN": z.string().min(1),
  en: z.union([z.string().min(1), z.null()]).optional(),
});

export const localizedTextSchema = z.object({
  "zh-CN": z.string().min(1),
  en: z.union([z.string().min(1), z.null()]).optional(),
});

export type LocalizedName = z.infer<typeof localizedNameSchema>;

export function resolveLocalizedName(
  name: LocalizedName | undefined,
  locale: Locale,
): string | null {
  if (!name) return null;
  if (locale === "en") {
    const en = name.en;
    if (typeof en === "string" && en.length > 0) return en;
    return name["zh-CN"];
  }
  return name["zh-CN"];
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "zh-CN" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export const localeInitScript = `(function(){try{var k=${JSON.stringify(LOCALE_STORAGE_KEY)};var l=localStorage.getItem(k);if(l==="en")document.documentElement.lang="en";else document.documentElement.lang="zh-CN";}catch(e){document.documentElement.lang="zh-CN";}})();`;
