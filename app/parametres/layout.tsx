import type { Metadata } from "next";
import { SettingsRail } from "./_rail";
import { getNotifications } from "@/lib/notifications";

export const metadata: Metadata = {
  title: { default: "Paramètres", template: "%s · Paramètres · Sur le Plat" },
};

// Common shell for every /parametres sub-route: the grouped side rail + the
// section content. The global chrome (TopBar + breadcrumb) comes from the root
// layout. Reads are dynamic (the sub-pages query Prisma).
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // "À compléter" counts per section → rail dots (same cache()'d source as the
  // notification bell).
  const { sectionCounts } = await getNotifications();

  return (
    <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-8">
        <SettingsRail release={process.env.APP_RELEASE} sectionCounts={sectionCounts} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
