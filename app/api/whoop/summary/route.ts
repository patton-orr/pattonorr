import { NextResponse, type NextRequest } from "next/server";
import {
  decryptTokens,
  encryptTokens,
  ensureAccessToken,
  fetchSummary,
  TOKEN_COOKIE,
  TOKEN_COOKIE_MAX_AGE,
} from "@/lib/whoop";

// Returns the WHOOP summary for the connected account, refreshing the access
// token (and re-persisting the rotated bundle) when needed.
export async function GET(request: NextRequest) {
  const raw = request.cookies.get(TOKEN_COOKIE)?.value;
  const tokens = raw ? decryptTokens(raw) : null;
  if (!tokens) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  let accessToken: string;
  let refreshed: Awaited<ReturnType<typeof ensureAccessToken>>["refreshed"];
  try {
    ({ accessToken, refreshed } = await ensureAccessToken(tokens));
  } catch {
    // Refresh token expired/revoked — treat as disconnected so the UI can
    // prompt a reconnect.
    const res = NextResponse.json({ connected: false }, { status: 200 });
    res.cookies.delete(TOKEN_COOKIE);
    return res;
  }

  let summary;
  try {
    summary = await fetchSummary(accessToken);
  } catch {
    return NextResponse.json(
      { connected: true, error: "fetch" },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ connected: true, summary });
  if (refreshed) {
    res.cookies.set(TOKEN_COOKIE, encryptTokens(refreshed), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_COOKIE_MAX_AGE,
    });
  }
  return res;
}
