import { z } from "zod";
import {
  localizedNameSchema,
  resolveLocalizedName,
  type Locale,
} from "@/lib/i18n/locale";
import uiJson from "../../../data/ui.json";

export const uiMessagesFileSchema = z.record(z.string(), localizedNameSchema);

export type UiMessageKey = keyof typeof uiJson;

const parsed = uiMessagesFileSchema.safeParse(uiJson);
if (!parsed.success) {
  console.error(parsed.error.flatten());
  throw new Error("UI 文案 data/ui.json 校验失败");
}

export const uiCatalog = parsed.data as Record<
  UiMessageKey,
  z.infer<typeof localizedNameSchema>
>;

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function text(key: UiMessageKey, locale: Locale): string {
  return resolveLocalizedName(uiCatalog[key], locale) ?? uiCatalog[key]["zh-CN"];
}

export type UiMessages = {
  [K in Exclude<
    UiMessageKey,
    "unknownWithId" | "unsupportedVersion"
  >]: string;
} & {
  unknownWithId: (id: string) => string;
  unsupportedVersion: (v: string | null) => string;
};

export function t(locale: Locale): UiMessages {
  const base = {} as Record<string, string>;
  for (const key of Object.keys(uiCatalog) as UiMessageKey[]) {
    base[key] = text(key, locale);
  }

  return {
    ...(base as Omit<UiMessages, "unknownWithId" | "unsupportedVersion">),
    unknownWithId: (id: string) =>
      fill(text("unknownWithId", locale), { id }),
    unsupportedVersion: (v: string | null) =>
      fill(text("unsupportedVersion", locale), {
        v: v ?? text("versionMissing", locale),
      }),
  };
}
