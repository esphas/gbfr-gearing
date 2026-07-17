"use client";

import { useState } from "react";
import { PLACEHOLDER_ICON } from "@/lib/catalog";

type Props = {
  src: string;
  alt: string;
  size?: number;
  style?: React.CSSProperties;
};

export function AssetIcon({ src, alt, size = 40, style }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const resolved = failed ? PLACEHOLDER_ICON : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      style={{
        borderRadius: 6,
        objectFit: "cover",
        background: "var(--ant-color-fill-secondary, #f0f0f0)",
        display: "block",
        ...style,
      }}
      onError={() => setFailedSrc(src)}
    />
  );
}
