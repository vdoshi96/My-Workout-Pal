import Link from "next/link";

import { PalSticker } from "@/components/ui/scene-stage";

export default function NotFound() {
  return <section className="member-empty status-page"><PalSticker pose="ready" /><h1>Page not found</h1><p>{"We couldn't find that page."}</p><Link className="primary-action" href="/app">Back to Today</Link></section>;
}
