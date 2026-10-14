import type { MetadataRoute } from "next";

const BASE = "https://mistdallas.org";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/nationals`, changeFrequency: "yearly", priority: 0.8 },
    { url: `${BASE}/gallery`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
