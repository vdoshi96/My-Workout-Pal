import { readFile, writeFile, mkdir } from "node:fs/promises";

const origin = process.argv[2] ?? "https://my-workout-pal-chi.vercel.app";
if (!["https://my-workout-pal-chi.vercel.app", "http://localhost:3108"].includes(origin)) throw new Error("Unapproved catalog check origin");
const inventory = JSON.parse(await readFile("docs/video-evidence/inventory.json", "utf8"));
const primary = inventory.filter(row => row.order === 1);
const results = [];
for (let index = 0; index < primary.length; index += 4) {
  results.push(...await Promise.all(primary.slice(index, index + 4).map(async row => {
    const response = await fetch(`${origin}/library/${row.slug}`, { signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    // Inspect rendered iframe markup, never embedded serialized React data.
    const frame = html.match(/<iframe\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? "";
    const matched = frame.includes(`youtube-nocookie.com/embed/${row.videoId}`);
    return { slug: row.slug, status: response.status, primaryMatches: matched };
  })));
}
const result = { checkedAt: new Date().toISOString(), origin, checked: results.length, passed: results.length === 134 && results.every(row => row.status === 200 && row.primaryMatches), results, limits: "Rendered public markup and primary mapping only. No playback or full viewing is inferred." };
await mkdir("docs/qa/latest/quiet-set", { recursive: true });
await writeFile("docs/qa/latest/quiet-set/public-catalog.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ checkedAt: result.checkedAt, origin, checked: result.checked, passed: result.passed }));
if (!result.passed) process.exitCode = 1;
