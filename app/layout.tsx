import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://marketheist.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Market Heist AI — Your Personal AI Analyst & Assistant",
    template: "%s | Market Heist AI",
  },
  description:
    "Market Heist AI is a tactical AI companion for market signals, analyses, and trading-pair requests across crypto, forex, and commodities.",
  keywords: [
    "Market Heist",
    "AI trading assistant",
    "trading signals",
    "crypto signals",
    "forex signals",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Market Heist AI",
    title: "Market Heist AI — Your Personal AI Analyst & Assistant",
    description:
      "A tactical AI companion for market signals, analyses, and trading-pair requests across crypto, forex, and commodities.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Heist AI — Your Personal AI Analyst & Assistant",
    description:
      "A tactical AI companion for market signals, analyses, and trading-pair requests across crypto, forex, and commodities.",
  },
};

export const viewport: Viewport = {
  themeColor: "#050a08",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
