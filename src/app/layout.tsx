import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { AntdProvider } from "@/components/AntdProvider";
import { FontPrewarm } from "@/components/FontPrewarm";
import { LocaleProvider } from "@/components/LocaleProvider";
import { themeInitScript } from "@/components/ThemeToggle";
import { localeInitScript } from "@/lib/i18n/locale";
import "./globals.css";

const body = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
      className={body.variable}
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
