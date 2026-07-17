"use client";

import { useEffect, useMemo } from "react";
import {
  allCharacters,
  allWrightstones,
  catalog,
} from "@/lib/catalog";
import { resolveLocalizedName } from "@/lib/i18n/locale";
import { uiCatalog } from "@/lib/i18n/messages";
import { useLocale } from "@/components/LocaleProvider";

export function FontPrewarm() {
  const { locale } = useLocale();

  const sample = useMemo(() => {
    const parts: string[] = [];
    const push = (name: Parameters<typeof resolveLocalizedName>[0]) => {
      const text = resolveLocalizedName(name, locale);
      if (text) parts.push(text);
    };

    for (const trait of catalog.traits) push(trait.name);
    for (const character of allCharacters()) {
      push(character.name);
      for (const skill of character.skills) push(skill.name);
      for (const weapon of Object.values(character.weapons)) {
        if (weapon) push(weapon.name);
      }
      for (const direction of character.masteries) push(direction.name);
      for (const slot of Object.values(character.exclusiveTraits)) {
        push(slot.name);
      }
    }
    for (const stone of allWrightstones()) push(stone.name);
    for (const entry of Object.values(uiCatalog)) push(entry);

    return parts.join("");
  }, [locale]);

  useEffect(() => {
    if (!sample || typeof document === "undefined" || !document.fonts?.load) {
      return;
    }
    const family = getComputedStyle(document.body).fontFamily;
    const weights = ["400", "500", "600", "700"] as const;
    void Promise.all(
      weights.map((weight) =>
        document.fonts.load(`${weight} 16px ${family}`, sample),
      ),
    );
  }, [sample]);

  return (
    <div aria-hidden className="font-prewarm">
      {sample}
    </div>
  );
}
