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
  // Module paths are not class names: "@/components/program/onboarding-form" must not keep `.onboarding-form` alive.
  .map((source) => source.replace(/^\s*(?:import|export)\b[^;]*?from\s*["'][^"']+["'];?/gmu, "").replace(/import\(\s*["'][^"']+["']\s*\)/gu, ""))
  .join("\n");
const words = new Set(markup.match(/[A-Za-z][A-Za-z0-9_-]*/gu));
const referenced = (className) =>
  words.has(className) || [...className.matchAll(/--|__/gu)].some((match) => words.has(className.slice(0, match.index + 2)));

// :is(), :where() and :has() take alternatives: the selector lives if any alternative can match.
// :not() never makes a selector dead. Every other class must be referenced.
function selectorIsLive(selector) {
  const group = /:(is|where|has|not)\(/u.exec(selector);
  if (!group) {
    const classes = [...selector.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/gu)].map((match) => match[1]);
    return classes.every(referenced);
  }
  let depth = 0;
  let end = group.index + group[0].length;
  for (; end < selector.length; end += 1) {
    if (selector[end] === "(") depth += 1;
    if (selector[end] === ")") { if (depth === 0) break; depth -= 1; }
  }
  const inner = selector.slice(group.index + group[0].length, end);
  const before = selector.slice(0, group.index);
  const after = selector.slice(end + 1);
  if (group[1] === "not") return selectorIsLive(`${before} ${after}`);
  return splitSelectors(inner).some((alternative) => selectorIsLive(`${before} ${alternative} ${after}`));
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
    // Comments and whitespace before the selector stay with the rule they describe.
    const headStart = prelude.replace(/\/\*[\s\S]*?\*\//gu, (comment) => " ".repeat(comment.length)).search(/\S[^]*$/u);
    const lead = headStart > 0 ? prelude.slice(0, headStart) : "";
    const head = headStart >= 0 ? prelude.slice(headStart) : prelude;
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
