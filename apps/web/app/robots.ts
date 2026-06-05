import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://archdefend.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/docs"],
        disallow: ["/dashboard/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
