import { getFaithAutoHighlight, getFaithHandwriting } from "@/lib/settings";
import { currentUserId } from "@/lib/current-user";
import { SettingsSection } from "../settings-section";
import { ToggleSetting } from "../toggle-setting";
import { saveAutoHighlight, saveHandwriting } from "../actions";

export const dynamic = "force-dynamic";

export default async function FaithSettings() {
  const userId = await currentUserId();
  const [autoHighlight, handwriting] = await Promise.all([
    getFaithAutoHighlight(userId),
    getFaithHandwriting(userId),
  ]);

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
      <ToggleSetting
        label="Handwritten accents"
        description="Show the verse card's label and reference in handwriting."
        initial={handwriting}
        onSave={saveHandwriting}
      />
    </SettingsSection>
  );
}
