import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { getWhoopSmoothing } from "@/lib/settings";
import { SettingsSection } from "../settings-section";
import { WhoopSmoothingSetting } from "../whoop-settings";

export const dynamic = "force-dynamic";

export default async function HealthSettings() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/dashboard/settings");
  const smoothing = await getWhoopSmoothing();

  return (
    <SettingsSection
      title="Health"
      description="WHOOP and health-tracking preferences."
    >
      <WhoopSmoothingSetting initial={smoothing} />
    </SettingsSection>
  );
}
