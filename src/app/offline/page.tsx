import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
export const metadata = { title: "Offline" };
export default function OfflinePage() {
  return <PublicShell current={null}><section className="status-page"><h1>{"You're offline"}</h1><p>{"Pages you've opened before still work. Changes save when you reconnect."}</p><Link className="primary-action" href="/">Go home</Link></section></PublicShell>;
}
