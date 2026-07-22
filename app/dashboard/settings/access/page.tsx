import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { getAllowlist, getPermissions } from "@/lib/access";
import { SettingsSection } from "../settings-section";
import { AccessManager } from "./access-manager";

export const dynamic = "force-dynamic";

export default async function AccessSettings() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/dashboard/settings");

  const [allowlist, permissions] = await Promise.all([
    getAllowlist(),
    getPermissions(),
  ]);
  const guests = allowlist.map((email) => ({
    email,
    sections: permissions[email] ?? [],
  }));

  return (
    <SettingsSection
      title="Access"
      description="Who can sign in with Google, and which sections each guest can see. You are the only admin."
    >
      <AccessManager initialGuests={guests} />
    </SettingsSection>
  );
}
