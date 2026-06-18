import type { Metadata, Viewport } from "next";
import { Newsreader, Hanken_Grotesk, Spline_Sans_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { TopBar } from "./components/top-bar";
import { Breadcrumb } from "./components/breadcrumb";
import { MobileTabBar } from "./components/mobile-tab-bar";
import { WidgetsDock } from "./components/widgets-dock";
import { SiteFooter } from "./components/site-footer";
import { ThemeScript } from "./components/theme-script";
import { getNotifications } from "@/lib/notifications";

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

// Brand wordmark only — Meal(o)day logotype.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mealoday — Recettes maison", template: "%s · Mealoday" },
  description: "Orchestrez vos menus : recherchez, consultez et créez vos recettes.",
};

// Dark top bar is what mobile browser chrome "sees".
export const viewport: Viewport = { themeColor: "#271d18" };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Derived "À traiter" signals for the bell + the mobile "Plus" badge
  // (cache()'d, shared with the /parametres rail in the same request).
  const notif = await getNotifications();
  // lang="fr": the app is in French (accessibility/SEO).
  // suppressHydrationWarning on <html> AND <body>: extensions (translation,
  // ColorZilla, Grammarly…) rewrite lang / style on <html> or inject attributes
  // on <body> after server rendering, causing a false hydration mismatch.
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${newsreader.variable} ${hanken.variable} ${splineMono.variable} ${outfit.variable} h-full`}
    >
      {/* pt clears the fixed chrome: TopBar (64px) everywhere, + the breadcrumb
          row (40px) on ≥ sm. pb on mobile clears the fixed bottom tab bar. */}
      <body
        className="flex min-h-full flex-col pt-[64px] pb-[76px] sm:pb-0 sm:pt-[104px]"
        suppressHydrationWarning
      >
        {/* Applies the saved theme/accent before paint (no light-theme flash). */}
        <ThemeScript />
        <TopBar notif={notif} />
        <Breadcrumb />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <MobileTabBar notifCount={notif.todoCount} />
        {/* Floating kitchen-widgets dock (global chrome, like the notif bell). */}
        <WidgetsDock />
      </body>
    </html>
  );
}
