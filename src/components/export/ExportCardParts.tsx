"use client";

import {
  catalog,
  displayName,
  getCharacter,
  getCharacterSkill,
  getMasteryTreeForCharacter,
  getTrait,
  getWeaponForCharacter,
  getWrightstone,
  resolveIcon,
  traitIconSrc,
} from "@/lib/catalog";
import type { BuildState } from "@/lib/schema/build";
import {
  computeDirectionBonuses,
  computeMasteryPoints,
  masteryNodeKey,
  type MasteryNodeRef,
  type MasteryPointBudget,
  type DirectionBonusState,
} from "@/lib/schema/mastery";
import type { MasteryTier, MasteryTree, Weapon, Wrightstone } from "@/lib/schema/catalog";
import {
  computeTraitLevelRows,
  type TraitLevelRow,
} from "@/lib/schema/trait-totals";
import { resolveLocalizedName, type Locale } from "@/lib/i18n/locale";
import type { UiMessages } from "@/lib/i18n/messages";
import { AssetIcon } from "@/components/AssetIcon";
import { TraitIcon } from "@/components/TraitIcon";

export const TIER_ORDER = ["tier1", "tier2", "tier3", "ex"] as const;

export function tierLabel(tier: MasteryTier, m: UiMessages) {
  switch (tier) {
    case "tier1":
      return m.tier1;
    case "tier2":
      return m.tier2;
    case "tier3":
      return m.tier3;
    case "ex":
      return m.tierEx;
  }
}

export type ExportCardModel = {
  build: BuildState;
  locale: Locale;
  m: UiMessages;
  qrDataUrl: string;
  characterName: string;
  weapon: Weapon | undefined;
  wrightstone: Wrightstone | undefined;
  masteryTree: MasteryTree | undefined;
  traitRows: TraitLevelRow[];
  masteryBudget: MasteryPointBudget | null;
  directionBonuses: DirectionBonusState[];
  selectedKeys: Set<string>;
  weaponName: string;
  wrightstoneName: string;
  masteryBudgetLine: string | null;
};

export function getExportCardModel(
  build: BuildState,
  locale: Locale,
  m: UiMessages,
  qrDataUrl: string,
): ExportCardModel {
  const character = getCharacter(build.characterId);
  const characterName = displayName(character, build.characterId, locale, m);
  const weapon = getWeaponForCharacter(build.characterId, build.weaponType);
  const wrightstone = build.wrightstoneId
    ? getWrightstone(build.wrightstoneId)
    : undefined;
  const masteryTree = getMasteryTreeForCharacter(build.characterId);
  const traitRows = computeTraitLevelRows(
    build,
    catalog.meta,
    catalog.traits,
    weapon,
    wrightstone,
  );
  const masteryBudget = masteryTree
    ? computeMasteryPoints(masteryTree, build.masteryNodes, catalog.meta)
    : null;
  const directionBonuses = masteryTree
    ? computeDirectionBonuses(masteryTree, build.masteryNodes, catalog.meta)
    : [];
  const selectedKeys = new Set(
    build.masteryNodes.map((n) => masteryNodeKey(n)),
  );

  const weaponName = weapon
    ? (resolveLocalizedName(weapon.name, locale) ?? weapon.name["zh-CN"])
    : m.selectWeapon;
  const wrightstoneName = wrightstone
    ? (resolveLocalizedName(wrightstone.name, locale) ??
      wrightstone.name["zh-CN"])
    : m.selectWrightstone;

  const masteryBudgetLine = masteryBudget
    ? TIER_ORDER.map(
        (tier) =>
          `${tierLabel(tier, m)} ${masteryBudget[tier].used}/${masteryBudget[tier].max}`,
      ).join(" · ")
    : null;

  return {
    build,
    locale,
    m,
    qrDataUrl,
    characterName,
    weapon,
    wrightstone,
    masteryTree,
    traitRows,
    masteryBudget,
    directionBonuses,
    selectedKeys,
    weaponName,
    wrightstoneName,
    masteryBudgetLine,
  };
}

export function TraitRow({
  id,
  gear,
  sigil,
  characterId,
  locale,
  m,
}: {
  id: string;
  gear: number;
  sigil: number;
  characterId: string;
  locale: Locale;
  m: UiMessages;
}) {
  const trait = getTrait(id, characterId);
  return (
    <li className="export-trait-row">
      <TraitIcon src={traitIconSrc(id, characterId)} size={16} />
      <span className="export-trait-name">
        {displayName(trait, id, locale, m)}
      </span>
      <span className="export-trait-levels">
        <span className="trait-totals-slv">Slv</span>
        {gear > 0 ? <span className="trait-level-gear">{gear}</span> : null}
        {gear > 0 && sigil > 0 ? (
          <span className="trait-level-plus">+</span>
        ) : null}
        {sigil > 0 ? <span className="trait-level-sigil">{sigil}</span> : null}
      </span>
    </li>
  );
}

export function SlotTraitLine({
  id,
  level,
  characterId,
  locale,
  m,
}: {
  id: string | null;
  level?: number;
  characterId: string;
  locale: Locale;
  m: UiMessages;
}) {
  if (!id) {
    return (
      <div className="export-slot-line muted">
        <TraitIcon src={null} size={16} />
        <span>—</span>
      </div>
    );
  }
  const trait = getTrait(id, characterId);
  return (
    <div className="export-slot-line">
      <TraitIcon src={traitIconSrc(id, characterId)} size={16} />
      <span className="min-w-0 truncate">
        {displayName(trait, id, locale, m)}
      </span>
      {level != null ? (
        <span className="export-slot-lv tabular-nums">Lv.{level}</span>
      ) : null}
    </div>
  );
}

export function MasteryDirectionBlock({
  dirIndex,
  dirName,
  selectedKeys,
  m,
  variant = "grid",
}: {
  dirIndex: number;
  dirName: string;
  selectedKeys: Set<string>;
  m: UiMessages;
  variant?: "grid" | "rows";
}) {
  return (
    <div
      className={`export-mastery-dir export-mastery-dir--${dirIndex}${variant === "rows" ? " export-mastery-dir--rows" : ""}`}
    >
      <div className="export-mastery-dir-head">{dirName}</div>
      {TIER_ORDER.map((tier) => {
        const nodeCount = catalog.meta.masteryDirectionCounts[tier];
        return (
          <div key={tier} className="export-mastery-tier">
            <div className="export-mastery-tier-label">{tierLabel(tier, m)}</div>
            <div className="export-mastery-nodes">
              {Array.from({ length: nodeCount }, (_, nodeIdx) => {
                const ref: MasteryNodeRef = {
                  d: dirIndex,
                  tier,
                  i: nodeIdx,
                };
                const on = selectedKeys.has(masteryNodeKey(ref));
                return (
                  <div
                    key={`${dirIndex}-${tier}-${nodeIdx}`}
                    className={`export-mastery-node ${on ? "on" : ""}`}
                  >
                    {nodeIdx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function QrBlock({
  qrDataUrl,
  size = 80,
}: {
  qrDataUrl: string;
  size?: number;
}) {
  return (
    <div className="export-qr export-qr--compact">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="" width={size} height={size} />
    </div>
  );
}

export function CharacterBlock({
  model,
  showNote,
  iconSize = 36,
}: {
  model: ExportCardModel;
  showNote: boolean;
  iconSize?: number;
}) {
  const { build, characterName } = model;
  const character = getCharacter(build.characterId);
  return (
    <section className="export-block export-character">
      <AssetIcon
        src={resolveIcon("characters", build.characterId, character?.icon)}
        alt={characterName}
        size={iconSize}
      />
      <div className="min-w-0">
        <div className="export-character-name">{characterName}</div>
        {showNote && build.note?.trim() ? (
          <div className="export-note">{build.note.trim()}</div>
        ) : null}
      </div>
    </section>
  );
}

export function SigilsBlock({
  model,
  dualColumn = false,
}: {
  model: ExportCardModel;
  dualColumn?: boolean;
}) {
  const { build, locale, m } = model;
  return (
    <section className="export-block">
      <div className="export-block-head">{m.sigils}</div>
      <div
        className={
          dualColumn
            ? "export-sigil-list export-sigil-list--dual"
            : "export-sigil-list"
        }
      >
        {build.sigilSlots.map((slot, index) => (
          <div key={index} className="export-sigil-row">
            <span className="export-sigil-idx">{index + 1}</span>
            <SlotTraitLine
              id={slot[0]}
              characterId={build.characterId}
              locale={locale}
              m={m}
            />
            <SlotTraitLine
              id={slot[1]}
              characterId={build.characterId}
              locale={locale}
              m={m}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MasterySideBySide({ model }: { model: ExportCardModel }) {
  const { m, locale, masteryTree, selectedKeys } = model;
  if (!masteryTree) {
    return <p className="export-empty">{m.noMasteryData}</p>;
  }
  return (
    <div className="export-mastery-grid">
      {masteryTree.map((dir, dirIdx) => (
        <MasteryDirectionBlock
          key={dirIdx}
          dirIndex={dirIdx}
          dirName={
            resolveLocalizedName(dir.name, locale) ?? dir.name["zh-CN"]
          }
          selectedKeys={selectedKeys}
          m={m}
        />
      ))}
    </div>
  );
}

export function MasteryStacked({ model }: { model: ExportCardModel }) {
  const { m, locale, masteryTree, selectedKeys } = model;

  if (!masteryTree) {
    return (
      <section className="export-block">
        <div className="export-block-head">{m.mastery}</div>
        <p className="export-empty">{m.noMasteryData}</p>
      </section>
    );
  }

  return (
    <>
      {masteryTree.map((dir, dirIdx) => (
        <section key={dirIdx} className="export-block">
          <MasteryDirectionBlock
            dirIndex={dirIdx}
            dirName={
              resolveLocalizedName(dir.name, locale) ?? dir.name["zh-CN"]
            }
            selectedKeys={selectedKeys}
            m={m}
          />
        </section>
      ))}
    </>
  );
}

export function WeaponBlock({ model }: { model: ExportCardModel }) {
  const { build, weapon, weaponName, locale, m } = model;
  return (
    <section className="export-block">
      <div className="export-block-head truncate" title={weaponName}>
        {weaponName}
      </div>
      <div className="export-equip-traits">
        {weapon
          ? (() => {
              let flex = 0;
              return weapon.traits.map((slot, i) => {
                const id =
                  slot.id != null
                    ? slot.id
                    : (build.weaponTraitIds[flex++] ?? null);
                return (
                  <SlotTraitLine
                    key={i}
                    id={id}
                    level={slot.level}
                    characterId={build.characterId}
                    locale={locale}
                    m={m}
                  />
                );
              });
            })()
          : Array.from({ length: 5 }, (_, i) => (
              <SlotTraitLine
                key={i}
                id={null}
                characterId={build.characterId}
                locale={locale}
                m={m}
              />
            ))}
      </div>
    </section>
  );
}

export function WrightstoneBlock({ model }: { model: ExportCardModel }) {
  const { build, wrightstone, wrightstoneName, locale, m } = model;
  return (
    <section className="export-block">
      <div className="export-block-head truncate" title={wrightstoneName}>
        {wrightstoneName}
      </div>
      <div className="export-equip-traits">
        {wrightstone
          ? (() => {
              let flex = 0;
              return wrightstone.traits.map((slot, i) => {
                const id =
                  slot.id != null
                    ? slot.id
                    : (build.wrightstoneTraitIds[flex++] ?? null);
                return (
                  <SlotTraitLine
                    key={i}
                    id={id}
                    level={slot.level}
                    characterId={build.characterId}
                    locale={locale}
                    m={m}
                  />
                );
              });
            })()
          : Array.from({ length: 3 }, (_, i) => (
              <SlotTraitLine
                key={i}
                id={null}
                characterId={build.characterId}
                locale={locale}
                m={m}
              />
            ))}
      </div>
    </section>
  );
}

export function SummonsBlock({ model }: { model: ExportCardModel }) {
  const { build, locale, m } = model;
  return (
    <section className="export-block">
      <div className="export-block-head">{m.summons}</div>
      <div className="export-equip-traits">
        {build.summonSlots.map((id, i) => (
          <SlotTraitLine
            key={i}
            id={id}
            characterId={build.characterId}
            locale={locale}
            m={m}
          />
        ))}
      </div>
    </section>
  );
}

export function AbilitiesBlock({ model }: { model: ExportCardModel }) {
  const { build, locale, m } = model;
  return (
    <section className="export-block">
      <div className="export-block-head">{m.abilities}</div>
      <div className="export-equip-traits">
        {build.skillIndices.map((skillIndex, i) => {
          const skill =
            skillIndex != null
              ? getCharacterSkill(build.characterId, skillIndex)
              : undefined;
          return (
            <div key={i} className="export-slot-line">
              <span className="export-sigil-idx">{i + 1}</span>
              <span className="min-w-0 truncate">
                {skill
                  ? (resolveLocalizedName(skill.name, locale) ??
                    skill.name["zh-CN"])
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TraitTotalsBlock({
  model,
  columns,
}: {
  model: ExportCardModel;
  columns?: TraitLevelRow[][];
}) {
  const { traitRows, build, locale, m } = model;

  if (traitRows.length === 0) {
    return (
      <section className="export-block">
        <div className="export-block-head">{m.traitTotals}</div>
        <p className="export-empty">{m.noTraits}</p>
      </section>
    );
  }

  if (columns && columns.length > 0) {
    return (
      <section className="export-block export-trait-totals-measured">
        <div className="export-block-head">{m.traitTotals}</div>
        <div
          className={`export-trait-cols${columns.length > 1 ? " export-trait-cols--dual" : ""}`}
        >
          {columns.map((col, colIdx) => (
            <ul key={colIdx} className="export-trait-col">
              {col.map((row) => (
                <TraitRow
                  key={row.id}
                  id={row.id}
                  gear={row.gear}
                  sigil={row.sigil}
                  characterId={build.characterId}
                  locale={locale}
                  m={m}
                />
              ))}
            </ul>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="export-block">
      <div className="export-block-head">{m.traitTotals}</div>
      <ul className="export-trait-grid">
        {traitRows.map((row) => (
          <TraitRow
            key={row.id}
            id={row.id}
            gear={row.gear}
            sigil={row.sigil}
            characterId={build.characterId}
            locale={locale}
            m={m}
          />
        ))}
      </ul>
    </section>
  );
}
