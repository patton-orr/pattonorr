import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import {
  getNavMenuOrder,
  getNavTopbarHidden,
  getNavTopbarOrder,
} from "@/lib/settings";
import { SettingsSection } from "../settings-section";
import { NavigationSettings } from "./navigation-settings";

export const dynamic = "force-dynamic";

export default async function NavigationSettingsPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/dashboard/settings");

  const [hidden, menuOrder, topbarOrder] = await Promise.all([
    getNavTopbarHidden(),
    getNavMenuOrder(),
    getNavTopbarOrder(),
  ]);

  return (
    <SettingsSection
      title="Navigation"
      description="Order the full menu and the top bar independently, and choose which sections show on the bar."
    >
      <NavigationSettings
        initialHidden={hidden}
        initialMenuOrder={menuOrder}
        initialTopbarOrder={topbarOrder}
      />
    </SettingsSection>
  );
}
