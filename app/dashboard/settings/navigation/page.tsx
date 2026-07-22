import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { getNavTopbarHidden } from "@/lib/settings";
import { SettingsSection } from "../settings-section";
import { NavigationSettings } from "./navigation-settings";

export const dynamic = "force-dynamic";

export default async function NavigationSettingsPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/dashboard/settings");

  const hidden = await getNavTopbarHidden();

  return (
    <SettingsSection
      title="Navigation"
      description="Choose which top-level sections appear on the horizontal top bar. The full menu (the hamburger) always shows everything."
    >
      <NavigationSettings initialHidden={hidden} />
    </SettingsSection>
  );
}
