"use client";

import { AssetIcon } from "@/components/AssetIcon";

type Props = {
  src?: string | null;
  alt?: string;
  size?: number;
};

export function TraitIcon({ src = null, alt = "", size = 18 }: Props) {
  return (
    <span
      className="trait-icon-slot"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        <AssetIcon
          src={src}
          alt={alt}
          size={size}
          className="!rounded-sm trait-icon-img"
        />
      ) : null}
    </span>
  );
}
