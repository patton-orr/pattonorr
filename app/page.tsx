import { signIn } from "@/auth";

// Public boilerplate. Everything of substance lives behind the sign-in link,
// under /dashboard (gated by the proxy).
export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Patton Orr
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Building things on the internet.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="mt-2 text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-600 dark:hover:text-zinc-300"
          >
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
}
