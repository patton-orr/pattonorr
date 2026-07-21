import { NextResponse, type NextRequest } from "next/server";
import { runSync } from "@/lib/whoop-sync";

// Cron-driven sync. Proxy lets this through without a session (see auth.ts);
// it's guarded here by CRON_SECRET, which Vercel Cron sends as a Bearer token.
// 60s is safe on every Vercel plan; daily incremental syncs are small. The
// one-time full history backfill is run out-of-band, not on this timed route.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
