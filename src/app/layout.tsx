import type { Metadata } from "next";
import { AntdProvider } from "@/components/AntdProvider";
import { FontPrewarm } from "@/components/FontPrewarm";
import { LocaleProvider } from "@/components/LocaleProvider";
import { themeInitScript } from "@/components/ThemeToggle";
import { bodyFont } from "@/lib/fonts";
import { localeInitScript } from "@/lib/i18n/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "GBFR 配装器",
  description: "碧蓝幻想 Relink 角色配装编辑器",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      className={bodyFont.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
      </head>
      <body>
        <LocaleProvider>
          <AntdProvider>
            <FontPrewarm />
            {children}
          </AntdProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
