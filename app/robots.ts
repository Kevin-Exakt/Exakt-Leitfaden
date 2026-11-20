import type { MetadataRoute } from "next";

/** Frei zugänglich mit Link, aber für Suchmaschinen gesperrt. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
