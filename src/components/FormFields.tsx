"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  compact?: boolean;
  disabled?: boolean;
  withIcon?: boolean;
  invalid?: boolean;
};

type MenuPos = {
  left: number;
  width: number;
  maxHeight: number;
  placement: "below" | "above";
  offset: number;
};

const MENU_MAX = 192;
const MENU_GAP = 4;

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  allowEmpty = true,
  emptyLabel,
  placeholder,
  compact = false,
  disabled = false,
  withIcon = false,
  invalid = false,
}: Props) {
  const { m } = useLocale();
  const resolvedEmpty = emptyLabel ?? m.emptyOption;
  const resolvedPlaceholder = placeholder ?? m.searchPlaceholder;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = options.find((o) => o.value === value) ?? null;
  const displayValue = filtering ? query : (selected?.label ?? "");
  const selectedIcon = withIcon ? (selected?.icon ?? null) : null;

  const filtered = useMemo(() => {
    if (!filtering) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const haystack = [
        o.label,
        o.value,
        ...(o.keywords ?? []),
      ]
        .join("\0")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query, filtering]);

  const close = useCallback(() => {
    setOpen(false);
    setFiltering(false);
    setQuery("");
    setMenuPos(null);
  }, []);

  const updateMenuPos = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const placement =
      spaceBelow < Math.min(MENU_MAX, 120) && spaceAbove > spaceBelow
        ? "above"
        : "below";
    const available = placement === "below" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(80, Math.min(MENU_MAX, available));
    const width = Math.max(rect.width, 160);
    setMenuPos({
      left: Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8,
      ),
      width,
      maxHeight,
      placement,
      offset:
        placement === "below"
          ? rect.bottom + MENU_GAP
          : window.innerHeight - rect.top + MENU_GAP,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPos();
  }, [open, filtered.length, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
      inputRef.current?.blur();
    };
    const onReposition = () => updateMenuPos();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, updateMenuPos]);

  const pick = (next: string | null) => {
    onChange(next);
    close();
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const inputClass = compact
    ? `trait-slot${invalid ? " trait-slot--invalid" : ""}`
    : `w-full rounded-md border px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]${
        invalid
          ? " border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_22%,var(--surface))]"
          : " border-[var(--border)] bg-[var(--surface)]"
      }`;

  const menu =
    open && !disabled && mounted && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            className="fixed z-[100] overflow-auto rounded border border-[var(--border)] bg-[var(--surface-2)] py-0.5 shadow-lg"
            style={{
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              ...(menuPos.placement === "below"
                ? { top: menuPos.offset }
                : { bottom: menuPos.offset }),
            }}
          >
            {allowEmpty ? (
              <li>
                <button
                  type="button"
                  className="trait-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(null)}
                >
                  {withIcon ? <TraitIcon src={null} size={16} /> : null}
                  <span className="text-[var(--muted)]">{resolvedEmpty}</span>
                </button>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-2 py-1 text-xs text-[var(--muted)]">
                {m.noMatch}
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    className={`trait-option ${
                      opt.value === value
                        ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--foreground)]"
                        : "text-[var(--foreground)]"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt.value)}
                  >
                    {withIcon ? (
                      <TraitIcon src={opt.icon ?? null} size={16} />
                    ) : null}
                    <span className="min-w-0 truncate">{opt.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )
      : null;

  const input = (
    <input
      ref={inputRef}
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      disabled={disabled}
      className={inputClass}
      placeholder={resolvedPlaceholder}
      value={displayValue}
      onFocus={(e) => {
        if (disabled) return;
        setOpen(true);
        setFiltering(false);
        setQuery("");
        e.currentTarget.select();
      }}
      onClick={() => {
        if (!disabled && !open) setOpen(true);
      }}
      onChange={(e) => {
        setFiltering(true);
        setQuery(e.target.value);
        if (!open) setOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          close();
          e.currentTarget.blur();
        }
        if (e.key === "Enter" && filtered[0]) {
          e.preventDefault();
          pick(filtered[0].value);
        }
      }}
    />
  );

  return (
    <div
      ref={rootRef}
      className={
        label ? "relative flex min-w-0 flex-col gap-0.5" : "relative min-w-0"
      }
    >
      {label ? (
        <span className="text-[10px] leading-none text-[var(--muted)]">
          {label}
        </span>
      ) : null}
      {withIcon ? (
        <div
          className={`trait-pick${invalid ? " trait-pick--invalid" : ""}`}
        >
          <TraitIcon src={selectedIcon} alt={selected?.label ?? ""} />
          <div className="trait-pick-control min-w-0 flex-1">{input}</div>
        </div>
      ) : (
        input
      )}
      {menu}
    </div>
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

export function SelectField({
  label,
  value,
  options,
  onChange,
  allowEmpty = true,
  emptyLabel,
}: SelectProps) {
  const { m } = useLocale();
  const resolvedEmpty = emptyLabel ?? m.emptyOption;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <select
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)]"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : v);
        }}
      >
        {allowEmpty ? <option value="">{resolvedEmpty}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
