import { auth } from "@/auth";
import { DashboardNav } from "./nav";
import { ContentArea } from "./content-area";

// Chrome shared by every private route under /dashboard. Nav is a persistent
// sidebar on tablet/desktop (>= md) and a hamburger drawer on phones; the
// signed-in identity + sign-out live inside it.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col font-sans md:flex-row">
      <DashboardNav email={session?.user?.email ?? undefined} />
      <ContentArea>{children}</ContentArea>
    </div>
  );
}
