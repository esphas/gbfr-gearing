"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  catalog,
  allCharacters,
  allWrightstones,
  characterSkillsFor,
  displayName,
  labelForName,
  flexibleWrightstoneTraitOptions,
  flexibleWeaponTraitOptions,
  getWrightstone,
  getCharacter,
  getCharacterSkill,
  getMasteryTreeForCharacter,
  getTrait,
  getWeaponForCharacter,
  exclusiveTraitSearchTexts,
  parseExclusiveTraitId,
  resolveIcon,
  resolveTraitName,
  sigilTraitsForCharacter,
  traitIconSrc,
  traitsForCharacter,
  weaponsForCharacter,
} from "@/lib/catalog";
import {
  buildShareSearchParams,
  parseShareSearchParams,
} from "@/lib/codec/build-codec";
import {
  decodeDraftBuild,
  fingerprintForBuild,
  readBuildDraft,
  shareFingerprint,
  writeBuildDraft,
} from "@/lib/codec/build-draft";
import { shareParseErrorMessage } from "@/lib/codec/share-errors";
import { resolveLocalizedName } from "@/lib/i18n/locale";
import { useLocale } from "@/components/LocaleProvider";
import { LocaleToggle } from "@/components/LocaleToggle";
import {
  createEmptyBuild,
  normalizeBuildSlots,
  withWrightstone,
  type BuildState,
} from "@/lib/schema/build";
import {
  computeDirectionBonuses,
  computeMasteryPoints,
  masteryNodeKey,
  withWeapon,
  type MasteryNodeRef,
} from "@/lib/schema/mastery";
import type { MasteryTier, WeaponType } from "@/lib/schema/catalog";
import { AssetIcon } from "@/components/AssetIcon";
import { SearchableSelect, SelectField } from "@/components/FormFields";
import { SaveImageMenu } from "@/components/SaveImageMenu";
import { ShareLinkMenu } from "@/components/ShareLinkMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TraitIcon } from "@/components/TraitIcon";
import { TraitTotalsPanel } from "@/components/TraitTotalsPanel";
import { computeTraitLevelRows } from "@/lib/schema/trait-totals";
import type { UiMessages } from "@/lib/i18n/messages";

const WEAPON_TRAIT_ROWS = 5;
const WRIGHTSTONE_TRAIT_ROWS = 3;

const TIER_ORDER = ["tier1", "tier2", "tier3", "ex"] as const;

function tierLabel(tier: MasteryTier, m: UiMessages) {
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

export function BuildEditor() {
  const { locale, m } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultCharacterId = allCharacters()[0]!.id;
  const [build, setBuild] = useState<BuildState>(() =>
    createEmptyBuild(defaultCharacterId, catalog.meta.slots),
  );
  const [banner, setBanner] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const draftMetaRef = useRef<{ fromShare: string | null; dirty: boolean }>({
    fromShare: null,
    dirty: false,
  });
  const alignedShareKeyRef = useRef<string | null | undefined>(undefined);

  const shareKey = shareFingerprint(searchParams);

  const setDraftMeta = useCallback(
    (meta: { fromShare: string | null; dirty: boolean }) => {
      draftMetaRef.current = meta;
      setDirty(meta.dirty);
    },
    [],
  );

  const selectedWeapon = getWeaponForCharacter(
    build.characterId,
    build.weaponType,
  );
  const selectedWrightstone = build.wrightstoneId
    ? getWrightstone(build.wrightstoneId)
    : undefined;

  const syncNormalize = useCallback((next: BuildState) => {
    const weapon = getWeaponForCharacter(next.characterId, next.weaponType);
    const wrightstone = next.wrightstoneId
      ? getWrightstone(next.wrightstoneId)
      : undefined;
    return normalizeBuildSlots(next, catalog.meta.slots, weapon, wrightstone);
  }, []);

  const persistDraft = useCallback((next: BuildState) => {
    writeBuildDraft({
      build: next,
      fromShare: draftMetaRef.current.fromShare,
      dirty: draftMetaRef.current.dirty,
    });
  }, []);

  useEffect(() => {
    if (alignedShareKeyRef.current === shareKey) {
      return;
    }
    alignedShareKeyRef.current = shareKey;

    const result = parseShareSearchParams(searchParams);
    const draft = readBuildDraft();

    const finish = (next: BuildState, meta: { fromShare: string | null; dirty: boolean }) => {
      setDraftMeta(meta);
      const normalized = syncNormalize(next);
      setBuild(normalized);
      writeBuildDraft({
        build: normalized,
        fromShare: meta.fromShare,
        dirty: meta.dirty,
      });
      setHydrated(true);
    };

    if (result.kind === "build" && shareKey) {
      setBanner(null);
      if (draft?.fromShare === shareKey && draft.dirty) {
        const local = decodeDraftBuild(draft);
        if (local) {
          finish(local, { fromShare: shareKey, dirty: true });
          return;
        }
      }
      finish(result.build, { fromShare: shareKey, dirty: false });
      return;
    }

    if (result.kind === "error") {
      setBanner(shareParseErrorMessage(result, m));
      if (draft) {
        const local = decodeDraftBuild(draft);
        if (local) {
          finish(local, {
            fromShare: draft.fromShare,
            dirty: draft.dirty,
          });
          return;
        }
      }
      finish(createEmptyBuild(defaultCharacterId, catalog.meta.slots), {
        fromShare: null,
        dirty: false,
      });
      return;
    }

    if (draft) {
      const local = decodeDraftBuild(draft);
      if (local) {
        setBanner(null);
        finish(local, {
          fromShare: draft.fromShare,
          dirty: draft.dirty,
        });
        return;
      }
    }

    setBanner(null);
    finish(createEmptyBuild(defaultCharacterId, catalog.meta.slots), {
      fromShare: null,
      dirty: false,
    });
  }, [shareKey, defaultCharacterId, syncNormalize, searchParams, m, setDraftMeta]);

  const updateBuild = useCallback(
    (updater: (prev: BuildState) => BuildState) => {
      setBuild((prev) => {
        const next = syncNormalize(updater(prev));
        setDraftMeta({
          fromShare: draftMetaRef.current.fromShare,
          dirty: true,
        });
        persistDraft(next);
        return next;
      });
    },
    [syncNormalize, persistDraft, setDraftMeta],
  );

  const character = getCharacter(build.characterId);
  const masteryTree = getMasteryTreeForCharacter(build.characterId);

  const weaponOptions = useMemo(
    () =>
      weaponsForCharacter(build.characterId).map((w) => ({
        value: w.type,
        label: resolveLocalizedName(w.name, locale) ?? w.name["zh-CN"],
      })),
    [build.characterId, locale],
  );

  const wrightstoneOptions = useMemo(
    () =>
      allWrightstones().map((b) => ({
        value: b.id,
        label: resolveLocalizedName(b.name, locale) ?? b.name["zh-CN"],
        icon: resolveIcon("wrightstones", b.id, b.icon),
      })),
    [locale],
  );

  const skillOptions = useMemo(
    () =>
      characterSkillsFor(build.characterId).map((s, index) => ({
        value: String(index),
        label: resolveLocalizedName(s.name, locale) ?? s.name["zh-CN"],
      })),
    [build.characterId, locale],
  );

  const traitOptions = useMemo(
    () =>
      traitsForCharacter(build.characterId).map((t) => ({
        value: t.id,
        label: labelForName(t.name, locale),
        icon: traitIconSrc(t.id),
      })),
    [build.characterId, locale],
  );

  const sigilTraitOptions = useMemo(
    () =>
      sigilTraitsForCharacter(build.characterId).map((t) => {
        const slot = parseExclusiveTraitId(t.id);
        return {
          value: t.id,
          label: labelForName(t.name, locale),
          icon: traitIconSrc(t.id, build.characterId),
          keywords: slot
            ? exclusiveTraitSearchTexts(slot, t.name)
            : undefined,
        };
      }),
    [build.characterId, locale],
  );

  const masteryBudget = useMemo(() => {
    if (!masteryTree) return null;
    return computeMasteryPoints(
      masteryTree,
      build.masteryNodes,
      catalog.meta,
    );
  }, [masteryTree, build.masteryNodes]);

  const directionBonuses = useMemo(() => {
    if (!masteryTree) return [];
    return computeDirectionBonuses(
      masteryTree,
      build.masteryNodes,
      catalog.meta,
    );
  }, [masteryTree, build.masteryNodes]);

  const traitLevelRows = useMemo(
    () =>
      computeTraitLevelRows(
        build,
        catalog.meta,
        catalog.traits,
        selectedWeapon,
        selectedWrightstone,
      ),
    [build, selectedWeapon, selectedWrightstone],
  );

  const switchCharacter = (characterId: string) => {
    updateBuild((prev) => {
      const keptWeapon =
        prev.weaponType != null
          ? (getWeaponForCharacter(characterId, prev.weaponType) ?? null)
          : null;
      return {
        ...prev,
        characterId,
        weaponType: keptWeapon?.type ?? null,
        weaponTraitIds: keptWeapon ? prev.weaponTraitIds : [],
        skillIndices: Array.from(
          { length: catalog.meta.slots.skills },
          () => null,
        ),
        masteryNodes: [],
      };
    });
    setBanner(null);
  };

  const switchWeapon = (weaponType: string | null) => {
    updateBuild((prev) => {
      const weapon = weaponType
        ? (getWeaponForCharacter(prev.characterId, weaponType as WeaponType) ??
          null)
        : null;
      return withWeapon(prev, weapon);
    });
  };

  const switchWrightstone = (wrightstoneId: string | null) => {
    updateBuild((prev) => {
      const wrightstone = wrightstoneId
        ? (getWrightstone(wrightstoneId) ?? null)
        : null;
      return withWrightstone(prev, wrightstone);
    });
  };

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = buildShareSearchParams(build);
    return `${window.location.origin}${pathname}?${params.toString()}`;
  }, [build, pathname]);

  const generateShareLink = useCallback(() => {
    const params = buildShareSearchParams(build);
    const fp = fingerprintForBuild(build);
    alignedShareKeyRef.current = fp;
    setDraftMeta({ fromShare: fp, dirty: false });
    persistDraft(build);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setBanner(null);
    setCopyStatus(null);
  }, [build, pathname, persistDraft, router, setDraftMeta]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus(m.copied);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus(m.copyFailed);
    }
  }, [shareUrl, m.copied, m.copyFailed]);

  const resetBuild = () => {
    const empty = createEmptyBuild(build.characterId, catalog.meta.slots);
    setDraftMeta({ fromShare: null, dirty: false });
    alignedShareKeyRef.current = undefined;
    setShareMenuOpen(false);
    setBuild(empty);
    writeBuildDraft({
      build: empty,
      fromShare: null,
      dirty: false,
    });
    router.replace(pathname, { scroll: false });
    setBanner(null);
  };

  const toggleMasteryNode = (ref: MasteryNodeRef) => {
    updateBuild((prev) => {
      const key = masteryNodeKey(ref);
      const selected = prev.masteryNodes.filter(
        (n) => masteryNodeKey(n) !== key,
      );
      if (selected.length !== prev.masteryNodes.length) {
        return { ...prev, masteryNodes: selected };
      }
      if (!masteryTree) return prev;
      const budget = computeMasteryPoints(
        masteryTree,
        prev.masteryNodes,
        catalog.meta,
      );
      if (budget[ref.tier].used >= budget[ref.tier].max) return prev;
      return { ...prev, masteryNodes: [...prev.masteryNodes, ref] };
    });
  };

  const setSigilTrait = (index: number, pos: 0 | 1, next: string | null) => {
    updateBuild((prev) => {
      const sigilSlots = [...prev.sigilSlots];
      const current: [string | null, string | null] = [
        sigilSlots[index]?.[0] ?? null,
        sigilSlots[index]?.[1] ?? null,
      ];
      current[pos] = next;
      sigilSlots[index] = current;
      return { ...prev, sigilSlots };
    });
  };

  if (!hydrated) {
    return (
      <div className="build-board mx-auto w-full max-w-[1720px] px-2 py-3 md:px-3">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--accent)]">
            {m.appTitle}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="px-1 py-6 text-sm text-[var(--muted)]">{m.loading}</div>
      </div>
    );
  }

  let weaponFlexIdx = -1;
  let wrightFlexIdx = -1;

  return (
    <div className="build-board mx-auto w-full max-w-[1720px] px-2 py-3 md:px-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--accent)]">
          {m.appTitle}
          {dirty ? (
            <span
              className="dirty-dot"
              title={m.dirtyHint}
              aria-label={m.dirtyHint}
            />
          ) : null}
        </span>
        <ShareLinkMenu
          shareUrl={shareUrl}
          open={shareMenuOpen}
          onOpenChange={setShareMenuOpen}
          onGenerate={generateShareLink}
          copyStatus={copyStatus}
          onCopy={copyShareLink}
        />
        <SaveImageMenu build={build} shareUrl={shareUrl} />
        <input
          className="min-w-[8rem] flex-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
          maxLength={catalog.meta.noteMaxLength}
          value={build.note ?? ""}
          onChange={(e) =>
            updateBuild((prev) => ({
              ...prev,
              note: e.target.value || undefined,
            }))
          }
          placeholder={m.notePlaceholder}
        />
        <button type="button" className="btn-secondary !px-2 !py-1 !text-xs" onClick={resetBuild}>
          {m.reset}
        </button>
        {banner ? (
          <span className="text-warn">{banner}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="build-grid gap-2">
        <TraitTotalsPanel
          rows={traitLevelRows}
          characterId={build.characterId}
        />

        <div className="build-main">
          <div className="build-char-col flex min-w-0 flex-col gap-2">
            <div className="board-block flex items-center gap-2 px-2 py-1.5">
              <AssetIcon
                src={resolveIcon("characters", build.characterId, character?.icon)}
                alt={displayName(character, build.characterId, locale, m)}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <SelectField
                  label={m.character}
                  value={build.characterId}
                  allowEmpty={false}
                  options={allCharacters().map((c) => ({
                    value: c.id,
                    label: resolveLocalizedName(c.name, locale) ?? c.name["zh-CN"],
                  }))}
                  onChange={(id) => id && switchCharacter(id)}
                />
              </div>
            </div>

            <div className="board-block overflow-visible">
              <div className="board-head">{m.sigils}</div>
              <table className="board-table board-table-sigils">
                <tbody>
                  {build.sigilSlots.map((slot, index) => {
                    const t0 = slot[0];
                    const t1 = slot[1];
                    const t0Invalid = Boolean(
                      t0 && !sigilTraitOptions.some((o) => o.value === t0),
                    );
                    const t1Invalid = Boolean(
                      t1 && !sigilTraitOptions.some((o) => o.value === t1),
                    );
                    return (
                      <tr key={`sigil-${index}`}>
                        <td className="sigil-index text-center text-[10px] text-[var(--muted)]">
                          {index + 1}
                        </td>
                        <td>
                          <SearchableSelect
                            compact
                            withIcon
                            invalid={t0Invalid}
                            value={t0}
                            options={
                              t0Invalid
                                ? [
                                    {
                                      value: t0!,
                                      label: resolveTraitName(
                                        t0,
                                        locale,
                                        m,
                                        build.characterId,
                                      ),
                                      icon: traitIconSrc(t0, build.characterId),
                                    },
                                    ...sigilTraitOptions,
                                  ]
                                : sigilTraitOptions
                            }
                            onChange={(next) => setSigilTrait(index, 0, next)}
                          />
                        </td>
                        <td>
                          <SearchableSelect
                            compact
                            withIcon
                            invalid={t1Invalid}
                            value={t1}
                            options={
                              t1Invalid
                                ? [
                                    {
                                      value: t1!,
                                      label: resolveTraitName(
                                        t1,
                                        locale,
                                        m,
                                        build.characterId,
                                      ),
                                      icon: traitIconSrc(t1, build.characterId),
                                    },
                                    ...sigilTraitOptions,
                                  ]
                                : sigilTraitOptions
                            }
                            onChange={(next) => setSigilTrait(index, 1, next)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="board-block min-w-0 overflow-auto">
              {masteryBudget ? (
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)]">
                  {TIER_ORDER.map((tier) => (
                    <span key={tier}>
                      {tierLabel(tier, m)} {masteryBudget[tier].used}/
                      {masteryBudget[tier].max}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary ml-auto !px-1.5 !py-0.5 !text-[10px]"
                    disabled={build.masteryNodes.length === 0}
                    onClick={() =>
                      updateBuild((prev) => ({ ...prev, masteryNodes: [] }))
                    }
                  >
                    {m.clearMastery}
                  </button>
                </div>
              ) : null}
              {masteryTree ? (
                <div className="mastery-grid">
                  {masteryTree.map((dir, dirIdx) => {
                    const bonus = directionBonuses.find(
                      (b) => b.directionIndex === dirIdx,
                    );
                    return (
                      <div key={dirIdx} className="mastery-dir">
                        <div className="board-head text-center text-[11px]">
                          {resolveLocalizedName(dir.name, locale) ?? dir.name["zh-CN"]}
                          <div className="mt-0.5 text-[9px] font-normal text-[var(--muted)]">
                            {[
                              bonus?.tier1 ? m.tier1Bonus : null,
                              bonus?.tier2 ? m.tier2Bonus : null,
                              bonus?.tier3 ? m.tier3Bonus : null,
                            ]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </div>
                        </div>
                        {TIER_ORDER.map((tier) => {
                          const nodeCount =
                            catalog.meta.masteryDirectionCounts[tier];
                          return (
                            <div key={tier} className="mastery-tier">
                              <div className="px-1 py-0.5 text-center text-[9px] text-[var(--muted)]">
                                {tierLabel(tier, m)}
                              </div>
                              <div className="mastery-nodes">
                                {Array.from(
                                  { length: nodeCount },
                                  (_, nodeIdx) => {
                                    const ref: MasteryNodeRef = {
                                      d: dirIdx,
                                      tier,
                                      i: nodeIdx,
                                    };
                                    const on = build.masteryNodes.some(
                                      (n) =>
                                        masteryNodeKey(n) ===
                                        masteryNodeKey(ref),
                                    );
                                    const label = String(nodeIdx + 1);
                                    return (
                                      <button
                                        key={`${dirIdx}-${tier}-${nodeIdx}`}
                                        type="button"
                                        className={`mastery-node ${on ? "on" : ""}`}
                                        onClick={() => toggleMasteryNode(ref)}
                                      >
                                        {label}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="p-3 text-xs text-[var(--muted)]">{m.noMasteryData}</p>
              )}
            </div>


          </div>

          <div className="build-bottom-row">
<div className="board-block overflow-visible">
                <div className="board-head flex items-center gap-2">
                  <span>{m.weapon}</span>
                  <div className="min-w-0 flex-1">
                    <SearchableSelect
                      compact
                      value={build.weaponType}
                      options={weaponOptions}
                      onChange={switchWeapon}
                      placeholder={m.selectWeapon}
                    />
                  </div>
                </div>
                <table className="board-table board-table-slots">
                  <tbody>
                    {Array.from({ length: WEAPON_TRAIT_ROWS }, (_, i) => {
                      const slot = selectedWeapon?.traits[i];
                      if (!slot || !selectedWeapon) {
                        return (
                          <tr key={`wtrait-pad-${i}`}>
                            <td className="w-6 text-center text-[10px] text-[var(--muted)]">
                              {i + 1}
                            </td>
                            <td>
                              <div className="trait-pick" aria-hidden>
                                <TraitIcon src={null} />
                                <div className="trait-pick-control">
                                  <div className="trait-slot trait-slot-muted">
                                    {selectedWeapon ? "\u00a0" : "—"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap text-right text-xs tabular-nums text-[var(--muted)]">
                              {selectedWeapon ? "" : "\u00a0"}
                            </td>
                          </tr>
                        );
                      }
                      const isFlex = slot.id === null;
                      if (isFlex) weaponFlexIdx += 1;
                      const flexIdx = weaponFlexIdx;
                      const selectedId = isFlex
                        ? (build.weaponTraitIds[flexIdx] ?? null)
                        : slot.id;
                      const trait = selectedId
                        ? getTrait(selectedId)
                        : undefined;
                      const poolOptions = isFlex
                        ? flexibleWeaponTraitOptions(
                            selectedWeapon,
                            build.weaponTraitIds,
                            flexIdx,
                          ).map((t) => ({
                            value: t.id,
                            label: labelForName(t.name, locale),
                            icon: traitIconSrc(t.id),
                          }))
                        : [];
                      return (
                        <tr key={`wtrait-${i}`}>
                          <td className="w-6 text-center text-[10px] text-[var(--muted)]">
                            {i + 1}
                          </td>
                          <td>
                            {isFlex ? (
                              <SearchableSelect
                                compact
                                withIcon
                                value={selectedId}
                                options={
                                  selectedId &&
                                  !poolOptions.some(
                                    (o) => o.value === selectedId,
                                  )
                                    ? [
                                        {
                                          value: selectedId,
                                          label: displayName(
                                            trait,
                                            selectedId,
                                            locale,
                                            m,
                                          ),
                                          icon: traitIconSrc(selectedId),
                                        },
                                        ...poolOptions,
                                      ]
                                    : poolOptions
                                }
                                onChange={(nextId) =>
                                  updateBuild((prev) => {
                                    const weaponTraitIds = [
                                      ...prev.weaponTraitIds,
                                    ];
                                    weaponTraitIds[flexIdx] = nextId;
                                    return { ...prev, weaponTraitIds };
                                  })
                                }
                              />
                            ) : (
                              <div className="trait-pick">
                                <TraitIcon
                                  src={traitIconSrc(selectedId)}
                                  alt=""
                                />
                                <div className="trait-pick-control">
                                  <span
                                    className="trait-slot trait-fixed"
                                    title={m.fixedTrait}
                                  >
                                    {displayName(trait, selectedId, locale, m)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-right text-xs tabular-nums text-[var(--muted)]">
                            Slv {slot.level}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

<div className="board-block overflow-visible">
                <div className="board-head flex items-center gap-2">
                  <span>{m.wrightstone}</span>
                  <div className="min-w-0 flex-1">
                    <SearchableSelect
                      compact
                      withIcon
                      value={build.wrightstoneId}
                      options={wrightstoneOptions}
                      onChange={switchWrightstone}
                      placeholder={m.selectWrightstone}
                    />
                  </div>
                </div>
                <table className="board-table board-table-slots">
                  <tbody>
                    {Array.from({ length: WRIGHTSTONE_TRAIT_ROWS }, (_, i) => {
                      const slot = selectedWrightstone?.traits[i];
                      if (!slot || !selectedWrightstone) {
                        return (
                          <tr key={`wstrait-pad-${i}`}>
                            <td className="w-6 text-center text-[10px] text-[var(--muted)]">
                              {i + 1}
                            </td>
                            <td>
                              <div className="trait-pick" aria-hidden>
                                <TraitIcon src={null} />
                                <div className="trait-pick-control">
                                  <div className="trait-slot trait-slot-muted">
                                    {selectedWrightstone ? "\u00a0" : "—"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap text-right text-xs tabular-nums text-[var(--muted)]">
                              {selectedWrightstone ? "" : "\u00a0"}
                            </td>
                          </tr>
                        );
                      }
                      const isFlex = slot.id === null;
                      if (isFlex) wrightFlexIdx += 1;
                      const flexIdx = wrightFlexIdx;
                      const selectedId = isFlex
                        ? (build.wrightstoneTraitIds[flexIdx] ?? null)
                        : slot.id;
                      const trait = selectedId
                        ? getTrait(selectedId)
                        : undefined;
                      const poolOptions = isFlex
                        ? flexibleWrightstoneTraitOptions(
                            selectedWrightstone,
                            build.characterId,
                            build.wrightstoneTraitIds,
                            flexIdx,
                          ).map((t) => ({
                            value: t.id,
                            label: labelForName(t.name, locale),
                            icon: traitIconSrc(t.id),
                          }))
                        : [];
                      return (
                        <tr key={`wstrait-${i}`}>
                          <td className="w-6 text-center text-[10px] text-[var(--muted)]">
                            {i + 1}
                          </td>
                          <td>
                            {isFlex ? (
                              <SearchableSelect
                                compact
                                withIcon
                                value={selectedId}
                                options={
                                  selectedId &&
                                  !poolOptions.some(
                                    (o) => o.value === selectedId,
                                  )
                                    ? [
                                        {
                                          value: selectedId,
                                          label: displayName(
                                            trait,
                                            selectedId,
                                            locale,
                                            m,
                                          ),
                                          icon: traitIconSrc(selectedId),
                                        },
                                        ...poolOptions,
                                      ]
                                    : poolOptions
                                }
                                onChange={(nextId) =>
                                  updateBuild((prev) => {
                                    const wrightstoneTraitIds = [
                                      ...prev.wrightstoneTraitIds,
                                    ];
                                    wrightstoneTraitIds[flexIdx] = nextId;
                                    return { ...prev, wrightstoneTraitIds };
                                  })
                                }
                              />
                            ) : (
                              <div className="trait-pick">
                                <TraitIcon
                                  src={traitIconSrc(selectedId)}
                                  alt=""
                                />
                                <div className="trait-pick-control">
                                  <span
                                    className="trait-slot trait-fixed"
                                    title={m.fixedTrait}
                                  >
                                    {displayName(trait, selectedId, locale, m)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-right text-xs tabular-nums text-[var(--muted)]">
                            Slv {slot.level}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

<div className="board-block board-block-summons overflow-visible">
              <div className="board-head">{m.summons}</div>
              <table className="board-table">
                <tbody>
                  {build.summonSlots.map((traitId, index) => (
                    <tr key={`summon-${index}`}>
                      <td className="w-5 text-center text-[10px] text-[var(--muted)]">
                        {index + 1}
                      </td>
                      <td>
                        <SearchableSelect
                          compact
                          withIcon
                          value={traitId}
                          options={traitOptions}
                          onChange={(next) =>
                            updateBuild((prev) => {
                              const summonSlots = [...prev.summonSlots];
                              summonSlots[index] = next;
                              return { ...prev, summonSlots };
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="board-block overflow-visible">
              <div className="board-head">{m.abilities}</div>
              <table className="board-table">
                <tbody>
                  {build.skillIndices.map((skillIndex, index) => {
                    const occupied = new Set(
                      build.skillIndices.flatMap((v, i) =>
                        i !== index && v != null ? [v] : [],
                      ),
                    );
                    const options = skillOptions.filter(
                      (o) => !occupied.has(Number(o.value)),
                    );
                    const orphan =
                      skillIndex != null &&
                      !options.some((o) => o.value === String(skillIndex))
                        ? {
                            value: String(skillIndex),
                            label: displayName(
                              getCharacterSkill(
                                build.characterId,
                                skillIndex,
                              ),
                              String(skillIndex),
                              locale,
                              m,
                            ),
                          }
                        : null;
                    return (
                      <tr key={`skill-${index}`}>
                        <td className="w-6 text-center text-[10px] text-[var(--muted)]">
                          {index + 1}
                        </td>
                        <td>
                          <SearchableSelect
                            compact
                            value={
                              skillIndex == null ? null : String(skillIndex)
                            }
                            options={orphan ? [orphan, ...options] : options}
                            onChange={(next) =>
                              updateBuild((prev) => {
                                const nextIndex =
                                  next == null ? null : Number(next);
                                if (
                                  nextIndex != null &&
                                  prev.skillIndices.some(
                                    (v, i) => i !== index && v === nextIndex,
                                  )
                                ) {
                                  return prev;
                                }
                                const skillIndices = [...prev.skillIndices];
                                skillIndices[index] = nextIndex;
                                return { ...prev, skillIndices };
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
