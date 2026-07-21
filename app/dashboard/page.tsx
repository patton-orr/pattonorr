// The private area — the 95%. Chrome (sidebar, identity, sign-out) lives in
// layout.tsx; this is just the Home page content.
export default function Dashboard() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Home
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Your private space. Add real content here, or new routes under{" "}
        <code className="font-mono text-sm">/dashboard</code> — everything below
        the homepage is gated by default.
      </p>
    </div>
  );
}
