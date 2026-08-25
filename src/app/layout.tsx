import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/source-sans-3";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaRegistration } from "@/components/pwa/pwa-registration";

const designContract = `<!--
THESIS: My Workout Pal makes equipment-aware programming visible as a route that can change without redrawing completed ground; it refuses the generic fitness dashboard.
OWN-WORLD: Warm mineral paper, deep blue-green ink, coral routes, lichen compatibility marks, contour geometry, waypoint controls, and ruled field sheets.
STORY: A guest sees five useful days, tests an equipment route, opens the selected day, and understands that account persistence is separate.
FIRST VIEWPORT: Compact brand and equipment control lead into a five-waypoint map; a selected-day sheet overlaps the route and holds the primary action above app navigation.
FORM: Grounded direction 3, training route atlas, seed ba529732.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export const metadata: Metadata = {
  applicationName: "My Workout Pal",
  title: {
    default: "My Workout Pal · An equipment-aware training route",
    template: "%s · My Workout Pal",
  },
  description:
    "Browse a five-day strength, core, and cardio plan that adapts to dumbbells or a barbell setup without rewriting workout history.",
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
