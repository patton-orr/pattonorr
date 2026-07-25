import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe auth config — NO database imports. Shared by the Node route
// handlers (auth.ts) and the proxy/middleware (proxy.ts). The DB-backed sign-in
// allowlist lives only in auth.ts so postgres never enters the edge bundle.
export const authConfig = {
  // Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (and AUTH_SECRET) from the
  // environment automatically.
  providers: [Google],
  callbacks: {
    // Gate every matched route. Default-deny: only the public homepage and the
    // install/branding assets are open; everything else needs a signed-in user.
    // This reads the session from the JWT — no database access.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/", "/manifest.webmanifest"];
      if (publicPaths.includes(pathname)) return true;
      // Favicons / app icons — must load on the signed-out homepage too.
      if (pathname.startsWith("/icons/")) return true;
      // The WHOOP cron sync has no session; it's guarded by CRON_SECRET.
      if (pathname === "/api/whoop/sync") return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
