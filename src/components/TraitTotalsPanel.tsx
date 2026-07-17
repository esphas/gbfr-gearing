"use client";

import { Card, Empty, Flex, Typography } from "antd";
import { displayName, getTrait, traitIconSrc } from "@/lib/catalog";
import type { TraitLevelRow } from "@/lib/schema/trait-totals";
import { useLocale } from "@/components/LocaleProvider";
import { TraitIcon } from "@/components/TraitIcon";

type Props = {
  rows: TraitLevelRow[];
  characterId: string;
};

export function TraitTotalsPanel({ rows, characterId }: Props) {
  const { locale, m } = useLocale();

  return (
    <Card size="small" title={m.traitTotals} styles={{ body: { padding: 0 } }}>
      {rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={m.noTraits}
          style={{ margin: "12px 0" }}
        />
      ) : (
        <Flex vertical>
          {rows.map((row, index) => {
            const trait = getTrait(row.id, characterId);
            return (
              <Flex
                key={row.id}
                align="center"
                gap={8}
                style={{
                  width: "100%",
                  minWidth: 0,
                  padding: "4px 10px",
                  borderBottom:
                    index < rows.length - 1
                      ? "1px solid var(--ant-color-border-secondary, var(--border))"
                      : undefined,
                }}
              >
                <TraitIcon
                  src={traitIconSrc(row.id, characterId)}
                  alt=""
                  size={20}
                />
                <Typography.Text
                  ellipsis
                  style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                >
                  {displayName(trait, row.id, locale, m)}
                </Typography.Text>
                <Flex
                  align="baseline"
                  gap={2}
                  style={{ flexShrink: 0, fontSize: 12 }}
                >
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    Slv
                  </Typography.Text>
                  {row.gear > 0 ? (
                    <span className="trait-level-gear">{row.gear}</span>
                  ) : null}
                  {row.gear > 0 && row.sigil > 0 ? (
                    <span className="trait-level-plus">+</span>
                  ) : null}
                  {row.sigil > 0 ? (
                    <span className="trait-level-sigil">{row.sigil}</span>
                  ) : null}
                  {trait?.maxLevel != null ? (
                    <span className="trait-level-max">
                      (MAX {trait.maxLevel})
                    </span>
                  ) : null}
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}
