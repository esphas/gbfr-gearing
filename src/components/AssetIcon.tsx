"use client";

import { useEffect, useState } from "react";
import { PLACEHOLDER_ICON } from "@/lib/catalog";

type Props = {
  src: string;
  alt: string;
  size?: number;
  className?: string;
};

export function AssetIcon({ src, alt, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = failed ? PLACEHOLDER_ICON : src;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-md object-cover bg-[var(--surface-2)] ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
