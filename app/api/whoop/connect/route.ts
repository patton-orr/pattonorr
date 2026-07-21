import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, STATE_COOKIE } from "@/lib/whoop";

// Kick off the WHOOP OAuth dance. Gated by the proxy, so only the signed-in
// user reaches it.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
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
