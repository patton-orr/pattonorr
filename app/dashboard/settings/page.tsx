import { getWhoopSmoothing } from "@/lib/settings";
import { WhoopSmoothingSetting } from "./whoop-settings";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const smoothing = await getWhoopSmoothing();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Settings
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          WHOOP
        </h2>
        <WhoopSmoothingSetting initial={smoothing} />
      </section>
    </div>
  );
}
