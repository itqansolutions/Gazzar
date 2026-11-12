import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gxfitness.academy";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/memberships", "/reset-password"],
        disallow: [
          "/api/",
          "/admin-public/",
          "/dashboard/",
          "/users/",
          "/clients/",
          "/coaches/",
          "/exercises/",
          "/templates/",
          "/programs/",
          "/attendance/",
          "/sports/",
          "/reports/",
          "/audit-logs/",
          "/settings/"
        ]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
