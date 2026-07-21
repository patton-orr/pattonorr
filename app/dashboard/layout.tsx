import { auth, signOut } from "@/auth";
import { SidebarNav } from "./nav";

// Chrome shared by every private route under /dashboard: a sidebar with nav,
// the signed-in identity, and sign-out. Page content renders in <main>.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col font-sans sm:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-black/[.08] bg-zinc-50 p-4 sm:w-60 sm:border-r sm:border-b-0 dark:border-white/[.145] dark:bg-black">
        <div className="px-3 pt-2 text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
          Patton Orr
        </div>

        <SidebarNav />

        <form
          className="mt-auto flex flex-col gap-3 border-t border-black/[.08] pt-4 dark:border-white/[.145]"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <span className="truncate px-3 text-xs text-zinc-500 dark:text-zinc-500">
            {session?.user?.email}
          </span>
          <button
            type="submit"
            className="rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  );
}
