import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { SettingsNav } from "./settings-nav";

// Shared chrome for every settings section: the title and the secondary nav
// pane. Each section's own content renders as {children}.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Settings
      </h1>
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <SettingsNav isAdmin={admin} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
