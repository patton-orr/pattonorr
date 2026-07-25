// Which favicon/app-icon this deployment wears.
//
// The WPO mark ships in two colors and BOTH live in the repo on every branch —
// the variant is chosen at runtime from the environment, never by swapping
// files. That's deliberate: a branch-specific icon file would get clobbered the
// moment `poc` fast-forwards into `main`. This way production is always black
// and every non-production environment is always red, and merging can't change
// either one.
//
// production (main on Vercel) -> black
// everything else (poc/preview deploys, local dev) -> red
export type IconVariant = "black" | "red";

export const iconVariant: IconVariant =
  process.env.VERCEL_ENV === "production" ? "black" : "red";

// Browsers (Safari especially) cache favicons far more stubbornly than normal
// assets and will happily serve a stale one for weeks. Bump this whenever the
// artwork changes to force a re-fetch everywhere.
const ICON_VERSION = "2";

const url = (file: string) => `/icons/${file}?v=${ICON_VERSION}`;

export const icons = {
  small: url(`icon-${iconVariant}-32.png`),
  medium: url(`icon-${iconVariant}-192.png`),
  large: url(`icon-${iconVariant}-512.png`),
  apple: url(`apple-icon-${iconVariant}.png`),
} as const;
