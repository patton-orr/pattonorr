// Next.js 16 deprecated the `middleware` file convention and renamed it to
// `proxy` (the exported function is `proxy`, not `middleware`). Auth.js's `auth`
// wrapper has the same signature, so we re-export it as the proxy function; it
// runs the `authorized` callback in auth.ts to gate every matched request.
export { auth as proxy } from "@/auth";

export const config = {
  // Protect everything except the Auth.js routes and Next.js static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
