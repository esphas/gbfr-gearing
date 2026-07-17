"use client";

import { useState } from "react";
import { Button, Dropdown, Flex, Modal, Typography } from "antd";
import type { MenuProps } from "antd";
import { useLocale } from "@/components/LocaleProvider";
import { BuildExportCard, type ExportLayout } from "@/components/BuildExportCard";
import {
  exportBuildImage,
  makeExportQrDataUrl,
  siteUrlWithoutParams,
} from "@/lib/export/export-build-image";
import type { BuildState } from "@/lib/schema/build";

type Props = {
  build: BuildState;
  shareUrl: string;
};

export function SaveImageMenu({ build, shareUrl }: Props) {
  const { locale, m } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    layout: ExportLayout;
    qrDataUrl: string;
  } | null>(null);

  const openPreview = async (layout: ExportLayout) => {
    if (!shareUrl) {
      setError(m.saveImageFailed);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const qrDataUrl = await makeExportQrDataUrl(shareUrl);
      setPreview({ layout, qrDataUrl });
    } catch {
      setError(m.saveImageFailed);
    } finally {
      setBusy(false);
    }
  };

  const saveFromPreview = async () => {
    if (!preview || !shareUrl) {
      setError(m.saveImageFailed);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await exportBuildImage({
        build,
        layout: preview.layout,
        shareUrl,
        locale,
        m,
      });
      setPreview(null);
    } catch {
      setError(m.saveImageFailed);
    } finally {
      setBusy(false);
    }
  };

  const items: MenuProps["items"] = [
    {
      key: "landscape",
      label: m.saveImageLandscape,
      disabled: busy,
      onClick: () => void openPreview("landscape"),
    },
    {
      key: "portrait",
      label: m.saveImagePortrait,
      disabled: busy,
      onClick: () => void openPreview("portrait"),
    },
  ];

  return (
    <>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Button loading={busy} onClick={() => setError(null)}>
          {busy ? m.saveImageWorking : m.saveImage}
        </Button>
      </Dropdown>
      {error && !preview ? (
        <Typography.Text type="danger" style={{ fontSize: 11 }}>
          {error}
        </Typography.Text>
      ) : null}

      <Modal
        open={Boolean(preview)}
        title={m.saveImagePreview}
        onCancel={() => setPreview(null)}
        width="auto"
        centered
        styles={{
          body: {
            maxHeight: "80vh",
            overflow: "auto",
            paddingTop: 12,
          },
        }}
        footer={
          <Flex gap={8} justify="end">
            <Button onClick={() => setPreview(null)} disabled={busy}>
              {m.saveImageClosePreview}
            </Button>
            <Button
              type="primary"
              loading={busy}
              onClick={() => void saveFromPreview()}
            >
              {busy ? m.saveImageWorking : m.saveImageDownload}
            </Button>
          </Flex>
        }
      >
        {error ? (
          <Typography.Text
            type="danger"
            style={{ fontSize: 12, display: "block", marginBottom: 8 }}
          >
            {error}
          </Typography.Text>
        ) : null}
        {preview ? (
          <BuildExportCard
            build={build}
            layout={preview.layout}
            locale={locale}
            m={m}
            qrDataUrl={preview.qrDataUrl}
            siteUrl={siteUrlWithoutParams(shareUrl)}
          />
        ) : null}
      </Modal>
    </>
  );
}
