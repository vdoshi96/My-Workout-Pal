import { createServer, type Server } from "node:http";

import { normalizeYouTubeReference } from "./normalization.ts";

export const YOUTUBE_EMBED_PROBE_HOST = "127.0.0.1";

export function renderYouTubeEmbedProbe(videoReference: string): string {
  const videoId = normalizeYouTubeReference(videoReference);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&amp;controls=1&amp;rel=0`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>YouTube embed probe · ${videoId}</title>
  <style>
    :root { color-scheme: light dark; font: 16px/1.5 system-ui, sans-serif; }
    body { margin: 0; padding: 1.5rem; background: Canvas; color: CanvasText; }
    main { width: min(100%, 720px); margin: 0 auto; }
    .player { width: 100%; min-height: 315px; aspect-ratio: 16 / 9; border: 0; background: #000; }
    a { color: LinkText; }
  </style>
</head>
<body>
  <main>
    <h1>Private YouTube embed playback probe</h1>
    <p>Confirm playback starts, controls are visible and keyboard-operable, then test the direct fallback. This page does not record evidence.</p>
    <iframe
      class="player"
      width="560"
      height="315"
      src="${embedUrl}"
      title="YouTube video ${videoId} playback probe"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
    <p><a href="${watchUrl}" target="_blank" rel="noopener noreferrer">Open the direct YouTube fallback</a></p>
  </main>
</body>
</html>`;
}

export async function startYouTubeEmbedProbeServer(options: Readonly<{
  videoReference: string;
  port?: number;
}>): Promise<Readonly<{
  url: string;
  close: () => Promise<void>;
}>> {
  const html = renderYouTubeEmbedProbe(options.videoReference);
  const server: Server = createServer((request, response) => {
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-src https://www.youtube-nocookie.com; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (request.url !== "/") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found\n");
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, YOUTUBE_EMBED_PROBE_HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("YouTube embed probe could not resolve its loopback address.");
  }
  return {
    url: `http://${YOUTUBE_EMBED_PROBE_HOST}:${address.port}/`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}
