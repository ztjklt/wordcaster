import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word Caster｜横版英语言灵守城游戏",
  description:
    "白天学习英语咒词，夜晚按住施法召唤士兵并自由搭建防线，守护言灵封印。",
  applicationName: "Word Caster",
  openGraph: {
    title: "Word Caster",
    description: "让英语词语成为魔法，关闭邪恶法师的召唤门。",
    type: "website",
    locale: "zh_CN",
    images: [
      {
        url: "/social-preview.png",
        width: 1672,
        height: 909,
        alt: "Word Caster 言灵法师守护封印的像素战场",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Word Caster",
    description: "原创中文横版英语言灵守城游戏。",
    images: ["/social-preview.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#182a29",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="./ui/theme.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
