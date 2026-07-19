import localFont from "next/font/local";

export const bodyFont = localFont({
  src: [
    {
      path: "../fonts/noto-sans-sc/400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/noto-sans-sc/500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/noto-sans-sc/600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/noto-sans-sc/700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
  preload: false,
});
