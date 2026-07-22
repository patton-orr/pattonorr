import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe Auth.js instance for the proxy/middleware ONLY — built from the
// DB-free config so postgres never enters the edge bundle. The full instance
// (with the DB-backed sign-in gate) is in auth.ts, used by Node route handlers.
export const { auth } = NextAuth(authConfig);
