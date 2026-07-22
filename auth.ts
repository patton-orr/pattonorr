import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// The admin (sole owner) is hardcoded so they can never be locked out by data.
const ADMIN_EMAIL = "pattonorr@gmail.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment
  // automatically; AUTH_SECRET is picked up the same way. Nothing hardcoded.
  providers: [Google],
  callbacks: {
    // Admin always; guests must be on the DB allowlist. The allowlist read is a
    // deferred import so the DB never enters the per-request proxy bundle, and a
    // failure only ever denies guests — the admin is decided before it runs.
    async signIn({ profile }) {
      const email = profile?.email;
      if (!email) return false;
      if (email.trim().toLowerCase() === ADMIN_EMAIL) return true;
      try {
        const { isAllowed } = await import("@/lib/access");
        return await isAllowed(email);
      } catch {
        return false;
      }
    },
    // Used by the proxy to gate every matched route. Default-deny: only the
    // public homepage is open; everything else requires the allow-listed user,
    // so any new page is private unless explicitly listed here.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // Public: the homepage plus the install/branding assets it references
      // (web manifest and generated icons), so logged-out visitors can add the
      // site to their home screen. Everything else requires the allowed user.
      const publicPaths = ["/", "/manifest.webmanifest", "/icon.png", "/apple-icon.png"];
      if (publicPaths.includes(pathname)) return true;
      // The WHOOP cron sync has no session; it's guarded by CRON_SECRET.
      if (pathname === "/api/whoop/sync") return true;
      return Boolean(auth?.user);
    },
  },
});
