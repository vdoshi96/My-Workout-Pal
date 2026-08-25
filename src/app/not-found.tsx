import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page contour-surface">
      <p className="status-stamp">Waypoint not found</p>
      <h1>This route is not on the map.</h1>
      <p>Return to the five-day program and choose a listed day.</p>
      <Link className="primary-action" href="/">
        Open program
      </Link>
    </main>
  );
}
