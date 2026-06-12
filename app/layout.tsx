import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Newsreader, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { TopBar } from "./components/top-bar";
import { Breadcrumb } from "./components/breadcrumb";
import { MobileTabBar } from "./components/mobile-tab-bar";
import { SiteFooter } from "./components/site-footer";

// Display serif (titles/hero), with italic for accents like the hero word.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// UI sans-serif (body, buttons, labels).
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Mono for eyebrows, quantities, technical labels.
const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Marmite. — Recettes maison", template: "%s · Marmite." },
  description: "Cuisine maison pour tous : recherchez, consultez et créez vos recettes.",
};

// Mobile browser chrome color (matches the cream page background / sticky bar).
export const viewport: Viewport = { themeColor: "#fff3e9" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang="fr": the app is in French (accessibility/SEO).
  // suppressHydrationWarning on <html> AND <body>: extensions (translation,
  // ColorZilla, Grammarly…) rewrite lang / style on <html> or inject attributes
  // on <body> after server rendering, causing a false hydration mismatch.
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${newsreader.variable} ${hanken.variable} ${splineMono.variable} h-full`}
    >
      {/* pt clears the fixed chrome: TopBar (68px) everywhere, + the breadcrumb
          row (40px) on ≥ sm. pb on mobile clears the fixed bottom tab bar. */}
      <body
        className="flex min-h-full flex-col pt-[68px] pb-[76px] sm:pb-0 sm:pt-[108px]"
        suppressHydrationWarning
      >
        <TopBar />
        {/* Suspense so the breadcrumb's headers()/DB lookup never blocks the page
            stream; its fixed-height slot is already reserved by the body padding. */}
        <Suspense fallback={null}>
          <Breadcrumb />
        </Suspense>
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <MobileTabBar />
      </body>
    </html>
  );
}
