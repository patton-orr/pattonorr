import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowedSections, isAllowed } from "@/lib/access";
import { isAdmin } from "@/lib/access-config";
import { currentUserId } from "@/lib/current-user";
import {
  getNavMenuOrder,
  getNavTopbarHidden,
  getNavTopbarOrder,
  getUserTheme,
} from "@/lib/settings";
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
  const email = session?.user?.email ?? undefined;
  const [sections, barHidden, menuOrder, topbarOrder, theme] = await Promise.all([
    allowedSections(email),
    getNavTopbarHidden(),
    getNavMenuOrder(),
    getNavTopbarOrder(),
    getUserTheme(await currentUserId()),
  ]);
  const admin = isAdmin(email);
  // Revocation takes effect immediately: sessions are long-lived JWTs, so a
  // guest removed from the allowlist still holds a valid cookie. Re-check
  // membership on every dashboard request (this is the one place home + settings
  // also flow through) and bounce a revoked guest back to the public page.
  if (email && !admin && !(await isAllowed(email))) redirect("/");

  return (
    <div
      id="app-accent"
      data-accent={theme}
      className="flex min-h-full flex-1 flex-col font-sans"
    >
      <DashboardNav
        email={email}
        sections={sections}
        barHidden={barHidden}
        menuOrder={menuOrder}
        topbarOrder={topbarOrder}
      />
      <ContentArea sections={sections} isAdmin={admin}>
        {children}
      </ContentArea>
    </div>
  );
}
