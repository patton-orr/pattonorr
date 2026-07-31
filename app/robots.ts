import type { MetadataRoute } from "next";

// Only the public homepage should be crawled — everything else is auth-gated,
// so keep crawlers out of the dashboard, reader, and API rather than letting
// them waste crawl budget on routes that just redirect to sign-in.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/bible", "/api"],
    },
    sitemap: "https://www.pattonorr.com/sitemap.xml",
    host: "https://www.pattonorr.com",
  };
}
