// Acceptance contract for docs/plans/PRODUCTION-GRADE-IMPLEMENTATION.md, section "Copy".
// Do not edit the lists in this file to make it pass; change the interface copy instead.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");

// Directories whose string literals and JSX text reach people using the app.
const scannedDirectories = ["src/app", "src/components"];
// API route handlers return machine-readable errors to the client, not UI copy.
const excludedPrefixes = ["src/app/api/"];

const bannedVocabulary =
  /\b(immutable|canonical|seeded|topology|idempotent|idempotency|reconcil\w*|snapshots?|namespace|firebase|http-only|persisted|persistence|operation|owned programs?|owner-only|domain|route interrupted|off the trail|field guide|field notes|credential gate)\b/i;

function sourceFiles(directory: string): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mts)$/.test(entry.name) ? [path] : [];
  });
}

function isDiagnosticCall(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isNewExpression(current) && current.expression.getText() === "Error") return true;
    if (ts.isCallExpression(current)) {
      const callee = current.expression.getText();
      if (/^console\./.test(callee)) return true;
    }
    if (ts.isJsxAttribute(current)) {
      const name = current.name.getText();
      if (name === "className" || name === "id" || name === "href" || name === "src" || name === "data-testid") return true;
    }
    if (ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) return true;
  }
  return false;
}

function userFacingText(file: string): string[] {
  const text = readFileSync(join(root, file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    let value: string | undefined;
    if (ts.isJsxText(node)) value = node.getText();
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
    else if (ts.isTemplateExpression(node)) value = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" … ");
    // Sentence-like text only: identifiers, keys, and enum values never contain a space.
    if (value !== undefined && /[A-Za-z]{2,}\s+[A-Za-z]/.test(value.trim()) && !isDiagnosticCall(node)) {
      found.push(value.replace(/\s+/g, " ").trim());
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("production copy contract", () => {
  it("keeps implementation vocabulary out of user-facing strings", () => {
    const offenders = scannedDirectories
      .flatMap(sourceFiles)
      .filter((file) => !excludedPrefixes.some((prefix) => file.startsWith(prefix)))
      .flatMap((file) =>
        userFacingText(file)
          .filter((value) => bannedVocabulary.test(value))
          .map((value) => `${relative(root, join(root, file))}: ${value.slice(0, 140)}`),
      );
    expect(offenders).toEqual([]);
  });

  const requiredCopy: ReadonlyArray<readonly [file: string, text: string]> = [
    ["src/components/workout/workout-runner.tsx", "End this workout?"],
    ["src/components/workout/workout-runner.tsx", "Sets you logged stay in your history."],
    ["src/components/workout/workout-runner.tsx", "Keep going"],
    ["src/components/workout/workout-runner.tsx", "Discard this change"],
    ["src/components/workout/workout-runner.tsx", "More options"],
    ["src/components/workout/workout-runner.tsx", "Pick your cardio finish."],
    ["src/components/workout/workout-runner.tsx", "All changes saved."],
    ["src/components/workout/owned-workout-runner.tsx", "Use the version saved to your account"],
    ["src/components/workout/owned-workout-runner.tsx", "Back to Today"],
    ["src/components/workout/workout-runner-presenters.ts", "Enter weight and reps to log this set."],
    ["src/components/program/program-editor.tsx", "Discard changes"],
    ["src/components/program/program-editor.tsx", "Discard your changes?"],
    ["src/components/program/program-collection.tsx", "Your routines"],
    ["src/components/program/onboarding-form.tsx", "Where would you like to start?"],
    ["src/components/layout/authenticated-shell.tsx", "Resend verification email"],
    ["src/components/layout/public-shell.tsx", "Sign in"],
    ["src/components/settings/settings-form.tsx", "Delete my account"],
    ["src/app/not-found.tsx", "Page not found"],
    ["src/app/app/not-found.tsx", "We couldn't find that page."],
    ["src/app/offline/page.tsx", "You're offline"],
    ["src/app/page.tsx", "Your account and workout data were deleted."],
    ["src/app/program/page.tsx", "Five-day example routine"],
    ["src/app/sign-in/page.tsx", "Sign in to save your workouts"],
    ["src/app/sample-workout/page.tsx", "Example workout"],
    ["src/app/progress/page.tsx", "Example data"],
  ];

  it.each(requiredCopy)("%s contains %j", (file, text) => {
    let contents = "";
    try {
      contents = readFileSync(join(root, file), "utf8");
    } catch {
      // A missing file fails the assertion below with a readable message.
    }
    expect(contents, `${file} must exist and contain the specified copy`).toContain(text);
  });
});
