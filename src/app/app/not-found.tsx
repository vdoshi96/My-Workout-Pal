import Link from "next/link";

export default function NotFound() {
  return <section className="member-empty"><h1>Page not found</h1><p>{"We couldn't find that page."}</p><Link className="primary-action" href="/app">Back to Today</Link></section>;
}
