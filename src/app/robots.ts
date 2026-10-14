import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/onboarding", "/login", "/auth", "/api"],
    },
    sitemap: "https://mistdallas.org/sitemap.xml",
  };
}
