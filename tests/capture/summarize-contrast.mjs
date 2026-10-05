// Summarize contrast samples written by capture-kit.ts into Markdown.
// Usage: node tests/capture/summarize-contrast.mjs [captureDirectory] > report.md
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "docs/qa/runs/capture");
const rows = [];
for (const project of readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const theme = project.name.endsWith("dark") ? "dark" : "light";
  for (const file of readdirSync(join(root, project.name)).filter((name) => name.endsWith(".contrast.json"))) {
    for (const sample of JSON.parse(readFileSync(join(root, project.name, file), "utf8"))) {
      rows.push({ ...sample, theme, project: project.name });
    }
  }
}

const key = (row) => `${row.theme}|${row.state}|${row.foreground}|${row.background}|${row.signature.split("|")[0]}`;
const textFailures = new Map();
const boundaryFailures = new Map();
for (const row of rows) {
  if (row.text && row.ratio < row.required) {
    const entry = textFailures.get(key(row)) ?? { ...row, screens: new Set() };
    entry.screens.add(row.screen);
    textFailures.set(key(row), entry);
  }
  // Boundaries only matter where the control has no other visible edge: focus rings and filled or bordered controls.
  if (row.boundary && row.boundary.ratio < 3 && (row.state === "focus" || row.state === "selected")) {
    const boundaryKey = `${key(row)}|${row.boundary.color}|${row.boundary.against}`;
    const entry = boundaryFailures.get(boundaryKey) ?? { ...row, screens: new Set() };
    entry.screens.add(row.screen);
    boundaryFailures.set(boundaryKey, entry);
  }
}

const states = ["default", "hover", "focus", "selected", "disabled"];
const sortRows = (a, b) => a.theme.localeCompare(b.theme) || states.indexOf(a.state) - states.indexOf(b.state) || a.ratio - b.ratio;
const element = (row) => row.signature.split("|")[0].replace(/\.(?=.)/u, " .").slice(0, 70);

console.log(`Samples: ${rows.length} across ${new Set(rows.map((row) => row.project)).size} projects.\n`);
console.log("| Theme | State | Element | Example text | Text | Background | Ratio | Needs | Over art | Screens |");
console.log("| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |");
for (const row of [...textFailures.values()].sort(sortRows)) {
  console.log(`| ${row.theme} | ${row.state} | \`${element(row)}\` | ${row.text.replaceAll("|", "/")} | \`${row.foreground}\` | \`${row.background}\` | ${row.ratio} | ${row.required} | ${row.overImage ? "yes" : "no"} | ${[...row.screens].join(", ")} |`);
}
console.log("\n| Theme | State | Element | Edge | Against | Ratio | Screens |");
console.log("| --- | --- | --- | --- | --- | ---: | --- |");
for (const row of [...boundaryFailures.values()].sort(sortRows)) {
  console.log(`| ${row.theme} | ${row.state} | \`${element(row)}\` | \`${row.boundary.color}\` | \`${row.boundary.against}\` | ${row.boundary.ratio} | ${[...row.screens].join(", ")} |`);
}
