// Removes CSS selectors whose classes no markup references, then drops rules and at-rule blocks left empty.
// Usage: node scripts/prune-unused-css.mjs [--check] src/app/globals.css src/app/studio-pals.css
// "Referenced" means the class appears as a whole word in src/ or the authenticated fixture, or a
// "prefix--" fragment for it does (for template-built modifiers such as `decorative-companion--${variant}`).
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const check = process.argv.includes("--check");
const files = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));

function walk(directory, found = []) {
  for (const name of readdirSync(directory)) {
    if (name === "node_modules" || name.startsWith(".next")) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (/\.(tsx?|mjs|js)$/u.test(name)) found.push(path);
  }
  return found;
}

const markup = [...walk(join(root, "src")), ...walk(join(root, "tests/fixtures/authenticated-app/app"))]
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
const words = new Set(markup.match(/[A-Za-z][A-Za-z0-9_-]*/gu));
const referenced = (className) =>
  words.has(className) || [...className.matchAll(/--|__/gu)].some((match) => words.has(className.slice(0, match.index + 2)));

function selectorIsLive(selector) {
  const classes = [...selector.replace(/:(?:not|has|is|where)\(/gu, " (").matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/gu)].map((match) => match[1]);
  // A selector is dead only if a class outside any :not() is unreferenced.
  const positive = [...selector.replace(/:not\([^)]*\)/gu, "").matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/gu)].map((match) => match[1]);
  return classes.length === 0 || positive.every(referenced);
}

function splitSelectors(list) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of list) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) { parts.push(current); current = ""; } else current += character;
  }
  parts.push(current);
  return parts;
}

// Minimal block parser: handles nested at-rules; comments are kept with the rule that follows them.
function prune(css, removed) {
  let output = "";
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open === -1) { output += css.slice(index); break; }
    let depth = 1;
    let close = open + 1;
    while (depth > 0 && close < css.length) {
      if (css[close] === "{") depth += 1;
      if (css[close] === "}") depth -= 1;
      close += 1;
    }
    const prelude = css.slice(index, open);
    const body = css.slice(open + 1, close - 1);
    const lead = prelude.match(/^[\s\S]*?(?=\S[^;}]*$)/u)?.[0] ?? "";
    const head = prelude.slice(lead.length);
    if (head.trim().startsWith("@")) {
      if (/^@(media|supports|layer|container)/u.test(head.trim())) {
        const inner = prune(body, removed);
        output += inner.trim() ? `${lead}${head}{${inner}}` : lead.replace(/\/\*[\s\S]*?\*\/\s*$/u, "");
      } else output += `${lead}${head}{${body}}`;
    } else {
      const selectors = splitSelectors(head);
      const live = selectors.filter((selector) => selectorIsLive(selector.trim()));
      for (const selector of selectors) if (!live.includes(selector)) removed.push(selector.trim());
      if (live.length) output += `${lead}${live.join(",").replace(/^\n+/u, "")}{${body}}`;
      else output += lead.replace(/\/\*[\s\S]*?\*\/\s*$/u, "");
    }
    index = close;
  }
  return output;
}

let total = 0;
for (const file of files) {
  const path = resolve(root, file);
  const source = readFileSync(path, "utf8");
  const removed = [];
  const result = prune(source, removed).replace(/\n{3,}/gu, "\n\n");
  total += removed.length;
  console.log(`${file}: ${removed.length} unused selectors`);
  for (const selector of removed) console.log(`  - ${selector.replace(/\s+/gu, " ").slice(0, 120)}`);
  if (!check && removed.length) writeFileSync(path, result);
}
if (check && total) process.exitCode = 1;
