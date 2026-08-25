import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { marked } from "marked";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const roots = ["AGENTS.md", "PRODUCT.md", "README.md", "docs"];

async function markdownFiles(target) {
  const absolute = path.join(root, target);
  const info = await stat(absolute);
  if (info.isFile()) return target.endsWith(".md") ? [target] : [];

  const files = [];
  for (const entry of await readdir(absolute)) {
    const relative = path.join(target, entry);
    const child = await stat(path.join(root, relative));
    if (child.isDirectory()) files.push(...(await markdownFiles(relative)));
    else if (relative.endsWith(".md")) files.push(relative);
  }
  return files;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleFrom(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function render(relative, markdown) {
  const sourceHash = createHash("sha256").update(markdown).digest("hex");
  const title = titleFrom(markdown, path.basename(relative, ".md"));
  const renderer = new marked.Renderer();
  const originalLink = renderer.link.bind(renderer);
  renderer.link = ({ href, title: linkTitle, tokens }) => {
    const normalizedHref = href.endsWith(".md") ? href.replace(/\.md$/, ".html") : href;
    return originalLink({ href: normalizedHref, title: linkTitle, tokens });
  };
  const body = marked.parse(markdown, { gfm: true, renderer });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="source-sha256" content="${sourceHash}">
  <title>${escapeHtml(title)} · My Workout Pal docs</title>
  <style>
    :root { color-scheme: light dark; --paper:#f3eee3; --ink:#0d3138; --route:#d95c42; --rule:#a7aa9a; --code:#e6e0d5; }
    @media (prefers-color-scheme: dark) { :root { --paper:#0b252b; --ink:#f4efe5; --route:#ff8269; --rule:#65777a; --code:#17363b; } }
    * { box-sizing:border-box; }
    html { background:var(--paper); color:var(--ink); font:17px/1.65 ui-sans-serif,system-ui,sans-serif; }
    body { margin:0 auto; max-width:78rem; padding:clamp(1rem,4vw,4rem); }
    main { max-width:76ch; }
    h1,h2,h3 { line-height:1.15; text-wrap:balance; }
    h1 { font-size:clamp(2.2rem,7vw,4.8rem); letter-spacing:-.035em; margin:0 0 2rem; }
    h2 { border-top:1px solid var(--rule); margin-top:3.5rem; padding-top:1.2rem; }
    a { color:var(--route); text-underline-offset:.18em; }
    code { background:var(--code); border-radius:.25rem; padding:.08em .3em; }
    pre { background:var(--code); border:1px solid var(--rule); overflow:auto; padding:1rem; }
    pre code { padding:0; }
    table { border-collapse:collapse; display:block; overflow:auto; width:100%; }
    th,td { border-bottom:1px solid var(--rule); padding:.65rem .8rem; text-align:left; vertical-align:top; }
    blockquote { border-inline-start:3px solid var(--route); margin-inline:0; padding-inline:1rem; }
    :focus-visible { outline:3px solid var(--route); outline-offset:3px; }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>
`;
}

const files = (await Promise.all(roots.map(markdownFiles))).flat().sort();
const mismatches = [];

for (const relative of files) {
  const markdown = await readFile(path.join(root, relative), "utf8");
  const output = render(relative, markdown);
  const htmlPath = path.join(root, relative.replace(/\.md$/, ".html"));

  if (checkOnly) {
    let actual = "";
    try {
      actual = await readFile(htmlPath, "utf8");
    } catch {
      mismatches.push(`${relative}: missing HTML counterpart`);
      continue;
    }
    if (actual !== output) mismatches.push(`${relative}: HTML counterpart is stale`);
  } else {
    await writeFile(htmlPath, output, "utf8");
  }
}

if (mismatches.length > 0) {
  for (const mismatch of mismatches) console.error(mismatch);
  process.exitCode = 1;
} else {
  console.log(`${checkOnly ? "Verified" : "Rendered"} ${files.length} documentation files.`);
}
