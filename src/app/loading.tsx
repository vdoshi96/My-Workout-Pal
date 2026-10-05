import { PalSticker } from "@/components/ui/scene-stage";

export default function Loading() {
  return (
    <main className="loading-shell status-page" aria-busy="true" aria-live="polite">
      <PalSticker pose="ready" />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
