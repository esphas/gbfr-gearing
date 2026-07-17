"use client";

import { Spin } from "antd";
import { useLocale } from "@/components/LocaleProvider";

export function LoadingFallback() {
  const { m } = useLocale();
  return (
    <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
      <Spin description={m.loading} size="large">
        <div style={{ padding: 32 }} />
      </Spin>
    </div>
  );
}
