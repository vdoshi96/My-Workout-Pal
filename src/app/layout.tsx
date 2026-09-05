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

const designContract = `<!--
THESIS: My Workout Pal makes a personal workout feel approachable through one truthful next action and one quiet animal companion, never a mascot-led dashboard.
OWN-WORLD: Quiet Set. Porcelain, forest, sage and ochre. Bright cel-animated gym with expressive original cartoon Pip the stoat and Mica the kingfisher, generous task space and readable training numbers.
STORY: Try one disposable set; create a personal routine; start or resume; log and rest; review actual work.
FIRST VIEWPORT: Today starts the next workout. The active workout puts current movement, target, and entry before reference material.
FORM: Quiet Set comparison report, September 4, 2026. Existing immutable training data and recovery remain authoritative.
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
        <template
          data-design-contract="quiet-set"
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
