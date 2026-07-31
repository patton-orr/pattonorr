import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { exchangeCode, STATE_COOKIE } from "@/lib/whoop";
import { saveTokens } from "@/lib/whoop-store";

// WHOOP redirects here with ?code&state after the user approves. Tokens are
// persisted to the DB (not a cookie) so the cron sync can use them. Admin only,
// mirroring /api/whoop/connect — the saved tokens are the owner's private, and
// a guest reaching this must never be able to write the shared 'me' row.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
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

  try {
    const tokens = await exchangeCode(code, `${url.origin}/api/whoop/callback`);
    await saveTokens(tokens);
  } catch {
    return fail("exchange");
  }

  const res = NextResponse.redirect(
    new URL("/dashboard/whoop?connected=1", url.origin),
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}
