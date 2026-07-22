// Next.js 16 deprecated the `middleware` file convention and renamed it to
// `proxy` (the exported function is `proxy`, not `middleware`). The proxy runs
// on the edge, so it re-exports the EDGE-SAFE Auth.js instance (auth.edge.ts,
// no database) to gate every matched request via the `authorized` callback. The
// DB-backed sign-in gate lives in auth.ts (Node route handlers only).
export { auth as proxy } from "./auth.edge";

export const config = {
  // Protect everything except the Auth.js routes and Next.js static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
