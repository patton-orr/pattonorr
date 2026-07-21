import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCode,
  encryptTokens,
  STATE_COOKIE,
  TOKEN_COOKIE,
  TOKEN_COOKIE_MAX_AGE,
} from "@/lib/whoop";

// WHOOP redirects here with ?code&state after the user approves.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/dashboard/whoop?error=${reason}`, url.origin),
    );

  if (url.searchParams.get("error")) return fail("denied");
  if (!code || !returnedState || returnedState !== savedState) {
    return fail("state");
  }

  let cookieValue: string;
  try {
    const tokens = await exchangeCode(code, `${url.origin}/api/whoop/callback`);
    cookieValue = encryptTokens(tokens);
  } catch {
    return fail("exchange");
  }

  const res = NextResponse.redirect(new URL("/dashboard/whoop", url.origin));
  res.cookies.set(TOKEN_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_COOKIE_MAX_AGE,
  });
  res.cookies.delete(STATE_COOKIE);
  return res;
}
