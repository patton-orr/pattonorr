import { getFaithAutoHighlight } from "@/lib/settings";
import { SettingsSection } from "../settings-section";
import { ToggleSetting } from "../toggle-setting";
import { saveAutoHighlight } from "../actions";

export const dynamic = "force-dynamic";

export default async function FaithSettings() {
  const autoHighlight = await getFaithAutoHighlight();

  return (
    <SettingsSection
      title="Faith"
      description="Bible reader and Scripture preferences."
    >
      <ToggleSetting
        label="Auto-highlight"
        description="When on, selecting text in the Bible reader highlights it instantly — no need to pick a color to confirm."
        initial={autoHighlight}
        onSave={saveAutoHighlight}
      />
    </SettingsSection>
  );
}
