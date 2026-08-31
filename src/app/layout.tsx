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
THESIS: My Workout Pal makes a personal workout feel approachable through one truthful next action and one quiet animal companion, never a mascot-led dashboard.
OWN-WORLD: Warm mineral paper, deep teal ink, coral action, lichen support, ruled field structure, contour geometry, and original hand-painted cel animal vignettes in reserved whitespace.
STORY: A guest understands the planning path, a member keeps the owned next move primary, and Progress remains a neutral disclosed preview.
FIRST VIEWPORT: On the landing, Your workout. Your way. and the unsaved starter action lead on the left while a text-free planning hedgehog occupies a bounded right-side slot that translates below actions on phone.
FORM: Selected Corner Companions extension over the route-atlas system, board key d787734c.
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
          data-design-contract="d787734c"
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
