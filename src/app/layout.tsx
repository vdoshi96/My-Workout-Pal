import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/source-sans-3";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { PwaRegistration } from "@/components/pwa/pwa-registration";

const designContract = `<!--
THESIS: My Workout Pal is a customizable workout companion: guests can inspect a truthful starter example, while signed-in people shape routines, train with guidance, and review private progress without rewriting completed ground.
OWN-WORLD: Warm mineral paper, deep blue-green ink, coral routes, lichen compatibility marks, hand-painted cartoon workout pals, contour geometry, waypoint controls, and ruled field sheets.
STORY: A guest learns how the companion supports planning, guidance, logging, and progress, explores an unsaved five-day example, and signs in only when they choose to make a routine their own.
FIRST VIEWPORT: A plain-language companion promise and starter-example action sit beside the established hand-drawn animal gym scene; personal account benefits remain secondary and explicit.
FORM: Grounded direction 3, training route atlas with a cartoon welcome-world extension, seed ba529732.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

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
    { media: "(prefers-color-scheme: light)", color: "#f3eee3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b252b" },
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
        <template
          data-design-contract="ba529732"
          // React cannot emit a bare comment as a body child, so the auditable contract
          // is preserved inside the body's first element and in its data attribute.
          dangerouslySetInnerHTML={{ __html: designContract }}
        />
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
