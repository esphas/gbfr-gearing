"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Input,
  Layout,
  Row,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
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

const { Header, Content } = Layout;

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

function FixedTrait({
  id,
  locale,
  m,
  fixedLabel,
}: {
  id: string | null;
  locale: Parameters<typeof displayName>[2];
  m: UiMessages;
  fixedLabel: string;
}) {
  const trait = id ? getTrait(id) : undefined;
  return (
    <Flex align="center" gap={6}>
      <TraitIcon src={id ? traitIconSrc(id) : null} alt="" />
      <Typography.Text
        ellipsis
        title={fixedLabel}
        type={id ? undefined : "secondary"}
        style={{ fontSize: 12 }}
      >
        {id ? displayName(trait, id, locale, m) : "—"}
      </Typography.Text>
    </Flex>
  );
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
    /* eslint-disable react-hooks/set-state-in-effect */
    if (alignedShareKeyRef.current === shareKey) {
      return;
    }
    alignedShareKeyRef.current = shareKey;

    const result = parseShareSearchParams(searchParams);
    const draft = readBuildDraft();

    const finish = (
      next: BuildState,
      meta: { fromShare: string | null; dirty: boolean },
    ) => {
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
    /* eslint-enable react-hooks/set-state-in-effect */
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
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        <Header className="build-header">
        <div className="build-header-brand">
          <Typography.Text strong>{m.appTitle}</Typography.Text>
        </div>
        <Space className="build-header-toggles">
          <LocaleToggle />
          <ThemeToggle />
        </Space>
      </Header>
      <Content style={{ padding: 24, textAlign: "center" }}>
        <Spin tip={m.loading} />
      </Content>
      </Layout>
    );
  }

  const weaponRows = Array.from({ length: WEAPON_TRAIT_ROWS }, (_, i) => {
    const slot = selectedWeapon?.traits[i];
    if (!slot || !selectedWeapon) {
      return {
        key: `wtrait-pad-${i}`,
        index: i + 1,
        trait: (
          <FixedTrait id={null} locale={locale} m={m} fixedLabel={m.fixedTrait} />
        ),
        level: selectedWeapon ? "" : "\u00a0",
      };
    }
    const isFlex = slot.id === null;
    const flexIdx = isFlex
      ? selectedWeapon.traits
          .slice(0, i)
          .filter((s) => s.id === null).length
      : -1;
    const selectedId = isFlex
      ? (build.weaponTraitIds[flexIdx] ?? null)
      : slot.id;
    const trait = selectedId ? getTrait(selectedId) : undefined;
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
    return {
      key: `wtrait-${i}`,
      index: i + 1,
      trait: isFlex ? (
        <SearchableSelect
          withIcon
          value={selectedId}
          options={
            selectedId && !poolOptions.some((o) => o.value === selectedId)
              ? [
                  {
                    value: selectedId,
                    label: displayName(trait, selectedId, locale, m),
                    icon: traitIconSrc(selectedId),
                  },
                  ...poolOptions,
                ]
              : poolOptions
          }
          onChange={(nextId) =>
            updateBuild((prev) => {
              const weaponTraitIds = [...prev.weaponTraitIds];
              weaponTraitIds[flexIdx] = nextId;
              return { ...prev, weaponTraitIds };
            })
          }
        />
      ) : (
        <FixedTrait
          id={selectedId}
          locale={locale}
          m={m}
          fixedLabel={m.fixedTrait}
        />
      ),
      level: `Slv ${slot.level}`,
    };
  });

  const wrightRows = Array.from({ length: WRIGHTSTONE_TRAIT_ROWS }, (_, i) => {
    const slot = selectedWrightstone?.traits[i];
    if (!slot || !selectedWrightstone) {
      return {
        key: `wstrait-pad-${i}`,
        index: i + 1,
        trait: (
          <FixedTrait id={null} locale={locale} m={m} fixedLabel={m.fixedTrait} />
        ),
        level: selectedWrightstone ? "" : "\u00a0",
      };
    }
    const isFlex = slot.id === null;
    const flexIdx = isFlex
      ? selectedWrightstone.traits
          .slice(0, i)
          .filter((s) => s.id === null).length
      : -1;
    const selectedId = isFlex
      ? (build.wrightstoneTraitIds[flexIdx] ?? null)
      : slot.id;
    const trait = selectedId ? getTrait(selectedId) : undefined;
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
    return {
      key: `wstrait-${i}`,
      index: i + 1,
      trait: isFlex ? (
        <SearchableSelect
          withIcon
          value={selectedId}
          options={
            selectedId && !poolOptions.some((o) => o.value === selectedId)
              ? [
                  {
                    value: selectedId,
                    label: displayName(trait, selectedId, locale, m),
                    icon: traitIconSrc(selectedId),
                  },
                  ...poolOptions,
                ]
              : poolOptions
          }
          onChange={(nextId) =>
            updateBuild((prev) => {
              const wrightstoneTraitIds = [...prev.wrightstoneTraitIds];
              wrightstoneTraitIds[flexIdx] = nextId;
              return { ...prev, wrightstoneTraitIds };
            })
          }
        />
      ) : (
        <FixedTrait
          id={selectedId}
          locale={locale}
          m={m}
          fixedLabel={m.fixedTrait}
        />
      ),
      level: `Slv ${slot.level}`,
    };
  });

  const slotColumns = [
    {
      title: "#",
      dataIndex: "index",
      width: 36,
      align: "center" as const,
      render: (v: number) => (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {v}
        </Typography.Text>
      ),
    },
    { title: "", dataIndex: "trait", render: (v: React.ReactNode) => v },
    {
      title: "",
      dataIndex: "level",
      width: 56,
      align: "right" as const,
      render: (v: string) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {v}
        </Typography.Text>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header className="build-header">
        <div className="build-header-brand">
          <Typography.Text strong>{m.appTitle}</Typography.Text>
          {dirty ? (
            <Badge
              status="warning"
              title={m.dirtyHint}
              aria-label={m.dirtyHint}
            />
          ) : null}
        </div>
        <Space className="build-header-actions" wrap>
          <ShareLinkMenu
            shareUrl={shareUrl}
            open={shareMenuOpen}
            onOpenChange={setShareMenuOpen}
            onGenerate={generateShareLink}
            copyStatus={copyStatus}
            onCopy={copyShareLink}
          />
          <SaveImageMenu build={build} shareUrl={shareUrl} />
        </Space>
        <Input
          className="build-header-note"
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
        <Space className="build-header-toggles">
          <LocaleToggle />
          <ThemeToggle />
        </Space>
        {banner ? (
          <Alert
            className="build-header-banner"
            type="warning"
            showIcon
            message={banner}
          />
        ) : null}
      </Header>

      <Content style={{ padding: 12, maxWidth: 1720, margin: "0 auto", width: "100%" }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} lg={6} xl={5}>
            <TraitTotalsPanel
              rows={traitLevelRows}
              characterId={build.characterId}
            />
          </Col>

          <Col xs={24} lg={18} xl={19}>
            <Row gutter={[8, 8]} align="stretch">
              <Col
                xs={24}
                md={10}
                xl={9}
                className="build-col build-col-sigils"
                style={{ display: "flex" }}
              >
                <Flex vertical gap={8} style={{ width: "100%" }}>
                  <Card size="small" styles={{ body: { padding: 8 } }}>
                    <Flex align="center" gap={8}>
                      <AssetIcon
                        src={resolveIcon(
                          "characters",
                          build.characterId,
                          character?.icon,
                        )}
                        alt={displayName(
                          character,
                          build.characterId,
                          locale,
                          m,
                        )}
                        size={40}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SelectField
                          label={m.character}
                          value={build.characterId}
                          allowEmpty={false}
                          options={allCharacters().map((c) => ({
                            value: c.id,
                            label:
                              resolveLocalizedName(c.name, locale) ??
                              c.name["zh-CN"],
                          }))}
                          onChange={(id) => id && switchCharacter(id)}
                        />
                      </div>
                      <Button onClick={resetBuild}>{m.reset}</Button>
                    </Flex>
                  </Card>

                  <Card
                    size="small"
                    title={m.sigils}
                    styles={{ body: { padding: 0 } }}
                  >
                    <Table
                      size="small"
                      pagination={false}
                      showHeader={false}
                      rowKey="key"
                      dataSource={build.sigilSlots.map((slot, index) => {
                        const t0 = slot[0];
                        const t1 = slot[1];
                        const t0Invalid = Boolean(
                          t0 && !sigilTraitOptions.some((o) => o.value === t0),
                        );
                        const t1Invalid = Boolean(
                          t1 && !sigilTraitOptions.some((o) => o.value === t1),
                        );
                        return {
                          key: `sigil-${index}`,
                          index: index + 1,
                          t0: (
                            <SearchableSelect
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
                                        icon: traitIconSrc(
                                          t0,
                                          build.characterId,
                                        ),
                                      },
                                      ...sigilTraitOptions,
                                    ]
                                  : sigilTraitOptions
                              }
                              onChange={(next) =>
                                setSigilTrait(index, 0, next)
                              }
                            />
                          ),
                          t1: (
                            <SearchableSelect
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
                                        icon: traitIconSrc(
                                          t1,
                                          build.characterId,
                                        ),
                                      },
                                      ...sigilTraitOptions,
                                    ]
                                  : sigilTraitOptions
                              }
                              onChange={(next) =>
                                setSigilTrait(index, 1, next)
                              }
                            />
                          ),
                        };
                      })}
                      columns={[
                        {
                          dataIndex: "index",
                          width: 40,
                          align: "center",
                          render: (v: number) => (
                            <Typography.Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {v}
                            </Typography.Text>
                          ),
                        },
                        { dataIndex: "t0", render: (v: React.ReactNode) => v },
                        { dataIndex: "t1", render: (v: React.ReactNode) => v },
                      ]}
                    />
                  </Card>
                </Flex>
              </Col>

              <Col
                xs={24}
                md={14}
                xl={15}
                className="build-col build-col-mastery"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <Card
                  size="small"
                  className="mastery-card"
                  style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  styles={{
                    body: {
                      padding: 8,
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 0,
                    },
                  }}
                  title={
                    masteryBudget ? (
                      <Flex
                        align="center"
                        gap={8}
                        wrap
                        style={{ width: "100%" }}
                      >
                        {TIER_ORDER.map((tier) => (
                          <Typography.Text
                            key={tier}
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {tierLabel(tier, m)} {masteryBudget[tier].used}/
                            {masteryBudget[tier].max}
                          </Typography.Text>
                        ))}
                        <Button
                          size="small"
                          style={{ marginLeft: "auto" }}
                          disabled={build.masteryNodes.length === 0}
                          onClick={() =>
                            updateBuild((prev) => ({
                              ...prev,
                              masteryNodes: [],
                            }))
                          }
                        >
                          {m.clearMastery}
                        </Button>
                      </Flex>
                    ) : (
                      m.mastery
                    )
                  }
                >
                  {masteryTree ? (
                    <div className="mastery-grid">
                      {masteryTree.map((dir, dirIdx) => {
                        const bonus = directionBonuses.find(
                          (b) => b.directionIndex === dirIdx,
                        );
                        return (
                          <div key={dirIdx} className="mastery-dir">
                            <div className="mastery-dir-head">
                              {resolveLocalizedName(dir.name, locale) ??
                                dir.name["zh-CN"]}
                              <div className="mastery-dir-bonus">
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
                              const rowCount = Math.ceil(nodeCount / 2);
                              return (
                                <div key={tier} className="mastery-tier">
                                  <div className="mastery-tier-label">
                                    {tierLabel(tier, m)}
                                  </div>
                                  <div
                                    className="mastery-nodes"
                                    style={{ flex: `${rowCount} 1 0` }}
                                  >
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
                                        return (
                                          <Button
                                            key={`${dirIdx}-${tier}-${nodeIdx}`}
                                            size="small"
                                            type={on ? "primary" : "default"}
                                            className="mastery-node"
                                            onClick={() =>
                                              toggleMasteryNode(ref)
                                            }
                                          >
                                            {nodeIdx + 1}
                                          </Button>
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
                    <Typography.Text type="secondary">
                      {m.noMasteryData}
                    </Typography.Text>
                  )}
                </Card>
              </Col>

              <Col
                xs={24}
                sm={12}
                lg={7}
                className="build-col build-col-weapon"
              >
                <Card
                  size="small"
                  title={
                    <Flex align="center" gap={8}>
                      <span>{m.weapon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SearchableSelect
                          value={build.weaponType}
                          options={weaponOptions}
                          onChange={switchWeapon}
                          placeholder={m.selectWeapon}
                        />
                      </div>
                    </Flex>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    size="small"
                    pagination={false}
                    showHeader={false}
                    rowKey="key"
                    dataSource={weaponRows}
                    columns={slotColumns}
                  />
                </Card>
              </Col>

              <Col
                xs={24}
                sm={12}
                lg={6}
                className="build-col build-col-wrightstone"
              >
                <Card
                  size="small"
                  title={
                    <Flex align="center" gap={8}>
                      <span>{m.wrightstone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SearchableSelect
                          withIcon
                          value={build.wrightstoneId}
                          options={wrightstoneOptions}
                          onChange={switchWrightstone}
                          placeholder={m.selectWrightstone}
                        />
                      </div>
                    </Flex>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    size="small"
                    pagination={false}
                    showHeader={false}
                    rowKey="key"
                    dataSource={wrightRows}
                    columns={slotColumns}
                  />
                </Card>
              </Col>

              <Col
                xs={24}
                sm={12}
                lg={5}
                className="build-col build-col-summons"
              >
                <Card
                  size="small"
                  title={m.summons}
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    size="small"
                    pagination={false}
                    showHeader={false}
                    rowKey="key"
                    dataSource={build.summonSlots.map((traitId, index) => ({
                      key: `summon-${index}`,
                      index: index + 1,
                      trait: (
                        <SearchableSelect
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
                      ),
                    }))}
                    columns={[
                      {
                        dataIndex: "index",
                        width: 28,
                        align: "center",
                        render: (v: number) => (
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {v}
                          </Typography.Text>
                        ),
                      },
                      {
                        dataIndex: "trait",
                        render: (v: React.ReactNode) => v,
                      },
                    ]}
                  />
                </Card>
              </Col>

              <Col
                xs={24}
                sm={12}
                lg={6}
                className="build-col build-col-abilities"
              >
                <Card
                  size="small"
                  title={m.abilities}
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    size="small"
                    pagination={false}
                    showHeader={false}
                    rowKey="key"
                    dataSource={build.skillIndices.map((skillIndex, index) => {
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
                      return {
                        key: `skill-${index}`,
                        index: index + 1,
                        trait: (
                          <SearchableSelect
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
                        ),
                      };
                    })}
                    columns={[
                      {
                        dataIndex: "index",
                        width: 28,
                        align: "center",
                        render: (v: number) => (
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {v}
                          </Typography.Text>
                        ),
                      },
                      {
                        dataIndex: "trait",
                        render: (v: React.ReactNode) => v,
                      },
                    ]}
                  />
                </Card>
              </Col>

            </Row>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
