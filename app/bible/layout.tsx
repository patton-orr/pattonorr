import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowedSections } from "@/lib/access";
import { isAdmin } from "@/lib/access-config";
import { getNavTopbarHidden } from "@/lib/settings";
import { DashboardNav } from "@/app/dashboard/nav";

// The Bible section (reader + landing) now renders like any other page: under
// the app's top nav, in a warm faith-themed content column, rather than as its
// own full-screen surface.
export default async function BibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email ?? undefined;
  const [sections, barHidden] = await Promise.all([
    allowedSections(email),
    getNavTopbarHidden(),
  ]);
  const admin = isAdmin(email);

  // Faith content — a guest without the Faith section shouldn't reach it.
  if (!admin && !sections.includes("faith")) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-1 flex-col font-sans">
      <DashboardNav
        email={email}
        sections={sections}
        isAdmin={admin}
        barHidden={barHidden}
      />
      <main
        className="faith-theme min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8"
        style={{ background: "var(--reader-bg)", color: "var(--reader-fg)" }}
      >
        {children}
      </main>
    </div>
  );
}
