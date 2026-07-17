"use client";

import { Flex, Select, Typography } from "antd";
import { useLocale } from "@/components/LocaleProvider";
import { TraitIcon } from "@/components/TraitIcon";

export type SelectOption = {
  value: string;
  label: string;
  icon?: string | null;
  keywords?: string[];
};

type Props = {
  label?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  withIcon?: boolean;
  invalid?: boolean;
};

type OptionData = SelectOption & {
  value: string;
  label: string;
};

function filterOption(input: string, option?: OptionData) {
  const q = input.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    option?.label ?? "",
    option?.value ?? "",
    ...(option?.keywords ?? []),
  ]
    .join("\0")
    .toLowerCase();
  return haystack.includes(q);
}

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  allowEmpty = true,
  emptyLabel,
  placeholder,
  disabled = false,
  withIcon = false,
  invalid = false,
}: Props) {
  const { m } = useLocale();
  const resolvedPlaceholder = placeholder ?? emptyLabel ?? m.searchPlaceholder;
  const selected = options.find((o) => o.value === value) ?? null;

  const select = (
    <Select<string, OptionData>
      style={{ width: "100%" }}
      showSearch
      allowClear={allowEmpty}
      disabled={disabled}
      status={invalid ? "error" : undefined}
      placeholder={resolvedPlaceholder}
      value={value ?? undefined}
      options={options}
      filterOption={filterOption}
      notFoundContent={m.noMatch}
      popupMatchSelectWidth={false}
      optionRender={(opt) => (
        <Flex align="center" gap={6}>
          {withIcon ? <TraitIcon src={opt.data.icon ?? null} size={16} /> : null}
          <span>{opt.label}</span>
        </Flex>
      )}
      labelRender={(props) => (
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
          {withIcon ? (
            <TraitIcon src={selected?.icon ?? null} size={16} />
          ) : null}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {props.label}
          </span>
        </Flex>
      )}
      onChange={(next) => onChange(next ?? null)}
    />
  );

  if (!label) return select;

  return (
    <Flex vertical gap={2} style={{ minWidth: 0, width: "100%" }}>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        {label}
      </Typography.Text>
      {select}
    </Flex>
  );
}

type SelectProps = {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function SelectField(props: SelectProps) {
  return <SearchableSelect {...props} />;
}
