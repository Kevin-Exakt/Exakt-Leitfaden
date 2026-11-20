import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Exakt-Service Navigator", template: "%s · Exakt-Service" },
  description: "Interaktiver Service- und Diagnoseleitfaden für Techniker von Exakt-Service.",
  applicationName: "Exakt-Service",
  // Frei zugänglich mit Link, aber nicht in Suchmaschinen.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Exakt-Service", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#facc15",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
