import { auth } from "@/auth";
import { getHomeShowWeather, getUserTheme } from "@/lib/settings";
import { currentUserId } from "@/lib/current-user";
import { SettingsSection } from "./settings-section";
import { ToggleSetting } from "./toggle-setting";
import { ThemePicker } from "./theme-picker";
import { saveShowWeather } from "./actions";

export const dynamic = "force-dynamic";

export default async function GeneralSettings() {
  const uid = await currentUserId();
  const [session, showWeather, theme] = await Promise.all([
    auth(),
    getHomeShowWeather(uid),
    getUserTheme(uid),
  ]);

  return (
    <SettingsSection
      title="General"
      description="App-wide preferences and your account."
    >
      <ThemePicker current={theme} />
      <ToggleSetting
        label="Show weather on Home"
        description="Display the current weather at the top of your dashboard home."
        initial={showWeather}
        onSave={saveShowWeather}
      />
      <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
        <span className="text-sm font-medium text-black dark:text-zinc-50">
          Account
        </span>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {session?.user?.email ?? "Signed in"}
        </p>
      </div>
    </SettingsSection>
  );
}
