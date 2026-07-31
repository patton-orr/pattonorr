import type { MetadataRoute } from "next";
import { icons } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Patton Orr",
    short_name: "Patton Orr",
    description: "Personal site of Patton Orr.",
    // Launch the installed app at the dashboard — the owner's destination.
    // A signed-out visitor is still routed to sign-in by the proxy.
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    // Icon color follows the environment (black in production, red everywhere
    // else) — see lib/brand.ts.
    icons: [
      { src: icons.medium, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icons.large, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icons.large, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: icons.apple, sizes: "180x180", type: "image/png" },
    ],
  };
}
