import { PalSticker } from "@/components/ui/scene-stage";

export default function AccountLoading() {
  return <section aria-busy="true" className="member-state status-page"><PalSticker pose="ready" /><p role="status">Loading…</p></section>;
}
