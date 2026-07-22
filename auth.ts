import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isAllowed } from "@/lib/access";

// The admin (sole owner) is hardcoded so they can never be locked out by data.
const ADMIN_EMAIL = "pattonorr@gmail.com";

// The full auth instance used by the Node route handlers / server components.
// It extends the edge-safe config with the DB-backed sign-in gate — safe here
// because this module never loads in the edge middleware (that's proxy.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Admin always; guests must be on the DB allowlist. A DB failure only ever
    // denies guests — the admin is decided before it runs.
    async signIn({ profile }) {
      const email = profile?.email;
      if (!email) return false;
      if (email.trim().toLowerCase() === ADMIN_EMAIL) return true;
      try {
        return await isAllowed(email);
      } catch {
        return false;
      }
    },
  },
});
