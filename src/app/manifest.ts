import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Workout Pal",
    short_name: "Workout Pal",
    description: "A customizable companion for planning routines, training with guidance, logging workouts, and reviewing progress.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3eee3",
    theme_color: "#0b252b",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Program", short_name: "Program", url: "/program", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Exercise library", short_name: "Library", url: "/library", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Progress", short_name: "Progress", url: "/progress", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
