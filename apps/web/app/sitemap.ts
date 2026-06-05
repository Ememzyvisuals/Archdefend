import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://archdefend.app";
  const now = new Date();

  return [
    { url: APP_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${APP_URL}/#pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${APP_URL}/#how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/#faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${APP_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
