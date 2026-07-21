import { auth } from "@/auth";
import { DashboardNav } from "./nav";
import { ContentArea } from "./content-area";

// Chrome shared by every private route under /dashboard. FT-style nav: a sticky
// top bar of top-level sections + a sub-nav row for the active section, with a
// hamburger drawer holding the full hierarchy (identity + sign-out live in it).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col font-sans">
      <DashboardNav email={session?.user?.email ?? undefined} />
      <ContentArea>{children}</ContentArea>
    </div>
  );
}
