import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { authorizeUrl, STATE_COOKIE } from "@/lib/whoop";

// Kick off the WHOOP OAuth dance. WHOOP is the owner's private, single-user
// connection stored under one 'me' row — admin only. Without this gate a guest
// could authorize their own WHOOP account and overwrite the owner's tokens.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }
  const redirectUri = `${origin}/api/whoop/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const res = NextResponse.redirect(authorizeUrl(redirectUri, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
