import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://stockpackz.xyz/sitemap.xml",
    host: "https://stockpackz.xyz",
  };
}
