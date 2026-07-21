import { WhoopPanel } from "./panel";

export default function Whoop() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WHOOP
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your latest recovery, sleep, and strain.
        </p>
      </div>
      <WhoopPanel />
    </div>
  );
}
