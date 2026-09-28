import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Workout Pal",
    short_name: "Workout Pal",
    description: "A customizable companion for planning routines, training with guidance, logging workouts, and reviewing progress.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f6f3e9",
    theme_color: "#f6f3e9",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", url: "/app", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Library", short_name: "Library", url: "/app/library", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Progress", short_name: "Progress", url: "/app/progress", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
