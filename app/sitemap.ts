import type { MetadataRoute } from "next";

// Everything but the homepage is auth-gated, so the sitemap is just the one
// public URL. (Kept static — no build-time dates that would churn the file.)
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.pattonorr.com",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
