import type { MetadataRoute } from "next";

const BASE_URL = "https://stockpackz.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE_URL, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/docs`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/token`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
}
