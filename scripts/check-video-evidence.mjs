import { readFile, writeFile } from "node:fs/promises";

const inventory = JSON.parse(await readFile(new URL("../docs/video-evidence/inventory.json", import.meta.url), "utf8"));
const outputArg = process.argv.indexOf("--output");
const output = outputArg >= 0 ? process.argv[outputArg + 1] : null;
const offline = process.argv.includes("--offline");
const seen = new Set();
const exceptions = [];
for (const row of inventory) {
  const key = `${row.slug}:${row.order}`;
  if (seen.has(key) || !/^[A-Za-z0-9_-]{11}$/.test(row.videoId)) exceptions.push({slug:row.slug,videoId:row.videoId,problem:"duplicate mapping or invalid ID"});
  seen.add(key);
}
const results = [];
if (!offline) {
  for (let i=0; i<inventory.length; i+=6) {
    results.push(...await Promise.all(inventory.slice(i,i+6).map(async (row) => {
      try {
        const url = new URL("https://www.youtube.com/oembed");
        url.searchParams.set("url",`https://www.youtube.com/watch?v=${row.videoId}`);
        url.searchParams.set("format","json");
        const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
        if (!response.ok) return {...row,metadata:"unavailable",status:response.status};
        const metadata = await response.json();
        return {...row,metadata:"available",observedTitle:String(metadata.title ?? ""),observedChannel:String(metadata.author_name ?? ""),checkedAt:new Date().toISOString()};
      } catch { return {...row,metadata:"unavailable",problem:"metadata request failed"}; }
    })));
  }
}
for (const row of results) if (row.metadata !== "available") exceptions.push({slug:row.slug,videoId:row.videoId,problem:row.problem ?? `HTTP ${row.status}`});
const report = {checkedAt:new Date().toISOString(),mode:offline?"inventory":"metadata",mappingCount:inventory.length,uniqueVideoCount:new Set(inventory.map(row=>row.videoId)).size,metadataAvailable:results.filter(row=>row.metadata==="available").length,exceptions,results,limits:"Metadata only. No playback, visual review, full viewing, editorial approval, seed or database mutation is performed."};
if (output) await writeFile(output,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({...report,results:undefined}));
if (exceptions.length) process.exitCode=1;
