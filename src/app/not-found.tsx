import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
export default function NotFound() {
  return <PublicShell current={null}><section className="status-page"><h1>Page not found</h1><p>{"We couldn't find that page."}</p><Link className="primary-action" href="/">Go home</Link></section></PublicShell>;
}
