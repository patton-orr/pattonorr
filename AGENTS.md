<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# pattonorr-site

Patton Orr's personal site + private dashboard, served at **www.pattonorr.com**. A public homepage with Google sign-in; everything else is a gated personal dashboard (health, faith/scripture, notes, ideas).

**Stack:** Next.js 16 (App Router) · React 19 + React Compiler · Tailwind v4 · Auth.js v5 (Google) · Neon Postgres via `postgres.js` · deployed on Vercel.

## Commands

```bash
npm run dev         # dev server (prefer the in-app Browser tools over raw shell)
npm run build       # production build — the real typecheck; run before committing
npm run lint        # eslint
npm run db:migrate  # apply db/schema.sql
```

`npx tsc --noEmit` also works, but ignore errors from `.next/dev/types/**` — those are stale dev-generated types, and a fresh `npm run build` regenerates them.

## Branch + deploy workflow

- **`poc`** is the working/experiment branch. **`main` is production — pushing it auto-deploys to Vercel.**
- Normal flow: commit to `poc` → fast-forward `main` → push. Confirm with the owner before deploying anything outward-facing.
- There is one Neon database shared by local and prod (there is no separate POC DB).

## Auth (default-deny)

Only `/`, the PWA/icon assets, and `/api/whoop/sync` (cron, `CRON_SECRET`-guarded) are public. Everything else requires a session.

The Auth.js config is **deliberately split three ways — do not merge it back**:

| File | Runtime | Contains |
|---|---|---|
| `auth.config.ts` | edge-safe | providers + `authorized` callback, **no DB imports** |
| `auth.edge.ts` | edge | the instance `proxy.ts` re-exports |
| `auth.ts` | Node | full instance; its `signIn` does the DB allowlist check |

`proxy.ts` (Next 16's renamed middleware) must export a `proxy` **function** — use `export { auth as proxy } from "./auth.edge"`. An inline `export const { auth: proxy } = NextAuth(...)` fails the framework's validator. The split exists because pulling `postgres` into the edge bundle broke guest sign-in.

Note: Google OAuth publishing status matters. While the OAuth app is in "Testing", only listed test users can sign in — allowlisted guests will still hit "Access Denied".

## Access model (admin + guests)

- **Admin is `pattonorr@gmail.com`, hardcoded** in `auth.ts` and `lib/access-config.ts` so the owner can't be locked out by data. Sole admin.
- Guests must be on a **DB-backed allowlist** (`app_settings` → `access.allowlist`), with per-section grants in `access.permissions`. Managed in the UI at **Settings → Access** (admin-only), so adding a guest needs no redeploy.
- Sections: `home` (always granted), `health`, `faith`, `notes`, `ideas`. **`home` and `health` are NOT grantable** — Health surfaces the owner's private WHOOP data.
- **Settings is open to every signed-in user** (personal prefs). Its admin-only panes — Health, Top bar, Access — redirect non-admins themselves.
- `lib/access-config.ts` is the client-safe half (constants, `isAdmin`, `sectionForPath`); `lib/access.ts` is server-only (touches the DB). Client components must import from `access-config`.
- Enforcement layers: nav filtering + a "No access" panel in `content-area.tsx` (cosmetic — the client panel still receives the RSC payload), **plus** a server-side hard gate. Call `requireSection(section)` from `lib/require-access.ts` at the top of every gated page's server component (and `requireAdmin()` in privileged actions / route handlers); it `redirect()`s a denied user before their content renders. The `/bible` reader enforces the same in its layout. When you add a new gated page, wire up `requireSection` — the client panel is belt-and-suspenders, not the boundary.

## Per-user data isolation

**Anything personal must be namespaced per user.** Keys are `u:<userId>:<key>` where `userId` is the normalized (lowercased) Google email from `currentUserId()` (`lib/current-user.ts`, wrapped in React `cache()`).

- Use `getUserSetting` / `setUserSetting` / `userPrefix` from `lib/settings.ts`.
- Per-user today: bible bookmarks, chapter notes + highlights, reading-plan progress, quick notes, `app.theme`, `home.showWeather`, `faith.autoHighlight`.
- Global (admin config, intentionally un-namespaced): `access.allowlist`, `access.permissions`, `whoop.smoothing`, `nav.topbarHidden`.

This was a real privacy bug once — global keys meant guests read the owner's scripture notes. When adding any user-facing preference or content, default to per-user.

## Navigation

FT-style: a sticky top bar (hamburger + brand, horizontal top-level sections, and a sub-nav row for the active section's children) plus a left drawer with the full hierarchy. Driven by the data array `NAV` in `app/dashboard/nav.tsx` — **add sections there, not by hand-writing markup.** `activeHref` uses most-specific-match so a parent never co-highlights with a child. The nav is filtered to the user's allowed sections. Settings → Top bar (admin) hides sections from the bar while keeping them in the drawer.

Direction: the nav is organizing into **life areas** (Work, Life, Finances, Faith, Relationships, Health), with a planned **focus toggle** to show only some areas at a time — that's a filter over `NAV`, not a render change.

## Theming

Per-user color themes via a `data-accent` attribute on the `#app-accent` wrapper (set in `app/dashboard/layout.tsx` and `app/bible/layout.tsx`). Themes: `standard`, `unc-normal`, `unc-bold`, `vandy-normal`, `vandy-bold`. UNC = Carolina Blue `#4B9CD3` + Navy `#13294B`; Vanderbilt = Black `#1C1C1C` + Gold `#CFAE70`.

- **Normal** sets accent tokens only (`--nav-pill-bg/fg`, `--subnav-border/fg`, `--header-border`).
- **Bold** is a full immersive skin: because Tailwind v4 emits `var(--color-*)`, remapping the neutral palette (`--color-white/black/zinc-*`) inside the accent scope re-skins cards/text/borders **by inheritance**, no per-component edits. Base neutrals cover light-OS utilities; a nested `prefers-color-scheme: dark` block covers the `dark:` ones, so Bold looks the same on either OS setting.
- Surfaces with hardcoded colors don't inherit: the WHOOP-revised cards, the Bible reader's sepia `.faith-theme`, and semantic colors (toggles, errors). Retheme those explicitly if needed.

The Faith surfaces share a warm "paper" palette (`.faith-theme` in `globals.css`), applied to the reader, the Faith pages, and the verse card; cards read `--faith-card` so they're neutral off-faith. Scripture renders in a serif (`--reader-serif`, led by Iowan Old Style); the notes UI stays sans.

## WHOOP

Single-user OAuth connection; tokens encrypted (AES-GCM, key from `AUTH_SECRET`) in `whoop_account`. Data lands in `whoop_cycle` / `whoop_recovery` / `whoop_sleep` / `whoop_workout` via incremental chunked upserts (`lib/whoop-sync.ts`), on a daily Vercel cron.

- `/dashboard/whoop-revised` is the **primary** WHOOP page. `/dashboard/whoop` is the detailed "WHOOP Data" page, reachable only from a link on the primary page.
- **WHOOP rotates the refresh token on every use and revokes the whole chain if a spent one is reused.** `getValidAccessToken` therefore single-flights refreshes behind a Postgres advisory lock (`pg_advisory_xact_lock`), with a lock-free fast path. Don't remove that guard — concurrent syncs previously killed the connection permanently.
- If the token does die, the fix is re-authorizing at `/api/whoop/connect`; a failed sync surfaces inline with a Reconnect link rather than crashing.
- Because `AUTH_SECRET` differs locally, prod-written tokens **can't be decrypted locally** — run syncs/backfills against prod.

## Conventions and gotchas

- **React Compiler is on: do not hand-write `useMemo`/`useCallback`.** Manual memo hooks fail `npm run lint` (`react-hooks/preserve-manual-memoization`).
- **DOM you mutate imperatively must not be handed to React** via `dangerouslySetInnerHTML` — React re-commits and wipes it. Render an empty `<div ref>` and let one effect own the content (this is how the Bible reader paints highlights).
- **Portability is a standing requirement.** Keep exit costs off Vercel low: standard Postgres over proprietary data APIs, thin abstractions in front of provider SDKs (`lib/db.ts`), exportable data, standard Next.js over Vercel-only tricks. Call out decisions that trade lock-in for convenience.
- **Design for iPhone / iPad / desktop by capability, not device sniffing** — `pointer: coarse` / `hover: none` + container width. Charts must work without hover; tap targets ≥44px; keep view state in the URL (`?range=`) so it carries across devices.
- **Favicon color is environment-driven, not file-driven.** The hand-drawn WPO mark ships in both black and red under `public/icons/`, and `lib/brand.ts` picks one: production is black, every other environment (poc previews, local dev) is red. Both files exist on every branch on purpose — a branch-specific icon file would be clobbered the moment `poc` fast-forwards into `main`. Don't "fix" this by swapping files, and keep `/icons/` in the `authorized` public allowlist so icons load signed-out.
- Dates display as MM-DD-YYYY (`fmtDate`); sync times render in US Eastern (`fmtEastern`). Storage/sorting stays ISO.
- `app_settings` is a single JSONB key/value table — prefer it over new tables for small config.
- Every **Future Idea** added to `/dashboard/ideas` gets a relative complexity (Low/Medium/High) and a time-lift estimate.

## Where things live

```
app/dashboard/            dashboard shell (nav.tsx, layout.tsx, content-area.tsx) + sections
app/dashboard/settings/   general (theme, weather) + faith; admin: health, navigation, access
app/bible/                the reader (top-level route, faith-themed)
lib/                      data + domain: access*, settings, current-user, bible*, whoop*, esv, db
db/schema.sql             schema; apply with npm run db:migrate
auth*.ts, proxy.ts        the three-way auth split described above
```

## Verifying UI

Use the in-app Browser tools rather than shell-running servers. Dashboard pages are auth-gated, so a local session is needed to see them — **do not commit auth bypasses**, and say so plainly when a change was verified by build only rather than in a live browser.
