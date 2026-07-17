"use client";

import { Button, Flex, Input, Popover, Typography } from "antd";
import { useLocale } from "@/components/LocaleProvider";

type Props = {
  shareUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: () => void;
  copyStatus: string | null;
  onCopy: () => void;
};

export function ShareLinkMenu({
  shareUrl,
  open,
  onOpenChange,
  onGenerate,
  copyStatus,
  onCopy,
}: Props) {
  const { m } = useLocale();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) onGenerate();
        onOpenChange(next);
      }}
      trigger="click"
      placement="bottomLeft"
      content={
        <Flex align="center" gap={8} style={{ maxWidth: "min(100vw - 1.5rem, 22rem)" }}>
          <Button onClick={onCopy}>{m.shareCopy}</Button>
          <Input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}
          />
          {copyStatus ? (
            <Typography.Text type="success" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
              {copyStatus}
            </Typography.Text>
          ) : null}
        </Flex>
      }
    >
      <Button type="primary">{m.shareLink}</Button>
    </Popover>
  );
}
