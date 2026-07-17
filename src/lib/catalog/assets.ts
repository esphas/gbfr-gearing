import type { Locale, LocalizedName } from "@/lib/i18n/locale";
import { resolveLocalizedName } from "@/lib/i18n/locale";
import type { UiMessages } from "@/lib/i18n/messages";

export const PLACEHOLDER_ICON = "/assets/_placeholder.webp";

export type AssetCategory =
  | "characters"
  | "weapons"
  | "skills"
  | "traits"
  | "masteries"
  | "wrightstones";

export function resolveIcon(
  category: AssetCategory,
  id: string | null | undefined,
  explicitIcon?: string,
): string {
  if (explicitIcon) return explicitIcon;
  if (!id) return PLACEHOLDER_ICON;
  return `/assets/${category}/${id}.webp`;
}

export function resolveTraitIconSrc(
  id: string | null | undefined,
  explicitIcon?: string,
): string | null {
  if (!id) return null;
  return resolveIcon("traits", id, explicitIcon);
}

export function displayName(
  entity: { name: LocalizedName } | undefined,
  fallbackId: string | null,
  locale: Locale,
  m?: Pick<UiMessages, "unknown" | "unknownWithId">,
): string {
  const resolved = entity ? resolveLocalizedName(entity.name, locale) : null;
  if (resolved) return resolved;
  if (fallbackId) {
    return m?.unknownWithId(fallbackId) ?? `Unknown (${fallbackId})`;
  }
  return m?.unknown ?? "Unknown";
}

export function labelForName(
  name: LocalizedName,
  locale: Locale,
): string {
  return resolveLocalizedName(name, locale) ?? name["zh-CN"];
}
