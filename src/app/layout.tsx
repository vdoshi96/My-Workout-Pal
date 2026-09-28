import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/source-sans-3";
import "./globals.css";
import "./quiet-set.css";

import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { PwaRegistration } from "@/components/pwa/pwa-registration";

export const metadata: Metadata = {
  applicationName: "My Workout Pal",
  title: {
    default: "My Workout Pal · Your customizable workout companion",
    template: "%s · My Workout Pal",
  },
  description:
    "Plan your own routine, train with guidance, log workouts, and review private progress with a customizable workout companion.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Workout Pal",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3e9" },
    { media: "(prefers-color-scheme: dark)", color: "#142a23" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Nonce-based CSP requires request-time rendering so Next can apply the
  // per-request nonce to its framework scripts and generated styles.
  await connection();

  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
