import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = "pattonorr@gmail.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment
  // automatically; AUTH_SECRET is picked up the same way. Nothing hardcoded.
  providers: [Google],
  callbacks: {
    // Only let the one allowed Google account complete sign-in.
    signIn({ profile }) {
      return profile?.email === ALLOWED_EMAIL;
    },
    // Used by the proxy (middleware) to gate every matched route.
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
