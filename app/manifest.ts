import type { MetadataRoute } from "next";

/** Ermöglicht „Zum Home-Bildschirm hinzufügen“ (PWA, ohne Offline-Modus). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Exakt-Service Navigator",
    short_name: "Exakt-Service",
    description: "Service- und Diagnoseleitfaden für Techniker",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#facc15",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
