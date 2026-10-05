// Every text/background and edge/background pairing the interface uses, per state.
// The stylesheet (src/app/studio-pals.css) is the single source of the colour values;
// tests/unit/design-token-contrast.test.ts resolves these names in both themes.
export type ContrastPair = Readonly<{
  state: "default" | "hover" | "focus" | "selected" | "active" | "disabled" | "error" | "celebration";
  use: string;
  foreground: string;
  background: string;
  kind: "text" | "large-text" | "edge";
}>;

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { state: "default", use: "Body text", foreground: "--ink", background: "--canvas", kind: "text" },
  { state: "default", use: "Body text on a soft group", foreground: "--ink", background: "--floor", kind: "text" },
  { state: "default", use: "Secondary text", foreground: "--ink-soft", background: "--canvas", kind: "text" },
  { state: "default", use: "Secondary text on a soft group", foreground: "--ink-soft", background: "--floor", kind: "text" },
  { state: "default", use: "Field text", foreground: "--ink", background: "--surface", kind: "text" },
  { state: "default", use: "Field hint", foreground: "--ink-soft", background: "--surface", kind: "text" },
  { state: "default", use: "Link", foreground: "--brand", background: "--canvas", kind: "text" },
  { state: "default", use: "Link on a soft group", foreground: "--brand", background: "--floor", kind: "text" },
  { state: "default", use: "Primary action label", foreground: "--on-sun", background: "--sun", kind: "text" },
  { state: "default", use: "Primary action edge", foreground: "--action-edge", background: "--canvas", kind: "edge" },
  { state: "default", use: "Secondary action edge", foreground: "--ink", background: "--canvas", kind: "edge" },
  { state: "default", use: "Field edge", foreground: "--rule", background: "--canvas", kind: "edge" },
  { state: "default", use: "Field edge inside a sheet", foreground: "--rule", background: "--surface", kind: "edge" },
  { state: "hover", use: "Primary action label", foreground: "--on-sun", background: "--sun-strong", kind: "text" },
  { state: "hover", use: "Ghost action and row label", foreground: "--ink", background: "--hover-bg", kind: "text" },
  { state: "hover", use: "Secondary text on a hovered row", foreground: "--ink-soft", background: "--hover-bg", kind: "text" },
  { state: "focus", use: "Focus ring on the page", foreground: "--focus", background: "--canvas", kind: "edge" },
  { state: "focus", use: "Focus ring on a soft group", foreground: "--focus", background: "--floor", kind: "edge" },
  { state: "focus", use: "Focus ring inside a sheet", foreground: "--focus", background: "--surface", kind: "edge" },
  { state: "selected", use: "Selected or current label", foreground: "--selected-fg", background: "--selected-bg", kind: "text" },
  { state: "selected", use: "Selected edge", foreground: "--selected-edge", background: "--selected-bg", kind: "edge" },
  { state: "selected", use: "Selected edge on the page", foreground: "--selected-edge", background: "--canvas", kind: "edge" },
  { state: "active", use: "Pressed primary action label", foreground: "--on-sun", background: "--sun-strong", kind: "text" },
  { state: "disabled", use: "Disabled label", foreground: "--ink-soft", background: "--canvas", kind: "text" },
  { state: "disabled", use: "Disabled label in a field", foreground: "--ink-soft", background: "--surface", kind: "text" },
  { state: "error", use: "Error text", foreground: "--danger", background: "--canvas", kind: "text" },
  { state: "error", use: "Error text in a sheet", foreground: "--danger", background: "--surface", kind: "text" },
  { state: "error", use: "Destructive action label", foreground: "--on-danger", background: "--danger", kind: "text" },
  { state: "celebration", use: "Record ribbon label", foreground: "--on-tangerine", background: "--tangerine", kind: "text" },
];
