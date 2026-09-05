import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "A little space for your next set",
  description: "Build a routine, log your sets, rest, and return. Try My Workout Pal without an account.",
};
export default function HomePage() {
  return <PublicShell current="home">
    <section className="quiet-welcome" aria-labelledby="landing-heading">
      <div className="quiet-welcome-copy">
        <h1 id="landing-heading">A little space<br />for your next set.</h1>
        <p>Your routine, a clear next step, and a place to keep the work you put in.</p>
        <Link className="primary-action" href="/try">Try one set <Icon name="arrow-right" /></Link>
        <span className="quiet-welcome-note">No account needed. Practice stays temporary.</span>
        <Link className="quiet-welcome-secondary" href="/app" prefetch={false}>Create my routine</Link>
      </div>
      {/* Plain image preserves the exact public offline asset and nonce CSP. */}
      <picture className="quiet-studio"><source media="(prefers-color-scheme: dark)" srcSet="/illustrations/quiet-set/evening-studio-phone.webp 600w, /illustrations/quiet-set/evening-studio.webp 1200w" sizes="(max-width: 700px) 100vw, 75vw" />
      <img src="/illustrations/quiet-set/dawn-studio.webp" srcSet="/illustrations/quiet-set/dawn-studio-phone.webp 600w, /illustrations/quiet-set/dawn-studio.webp 1200w" sizes="(max-width: 700px) 100vw, 75vw" width="1200" height="800" alt="" aria-hidden="true" fetchPriority="high" /></picture>
    </section>
    <section className="quiet-welcome-path" aria-labelledby="welcome-path-title">
      <div><h2 id="welcome-path-title">Make it yours.<br />Take it one set at a time.</h2><p>Choose your movements and targets. Log what happened, take your rest, and pick up where you left off.</p></div>
      <ol><li><strong>Build your routine</strong><span>Start empty or adapt the five-day example.</span></li><li><strong>Train at your pace</strong><span>Keep guidance nearby and your next set in reach.</span></li><li><strong>See the work add up</strong><span>Review your actual sets, reps, and saved sessions.</span></li></ol>
    </section>
    <section className="quiet-example" aria-labelledby="example-title"><div><h2 id="example-title">A starting point, if you want one.</h2><p>Explore Push, Pull, Legs, Upper, and Lower. Keep what fits and change the rest.</p></div><Link className="secondary-action" href="/program">Explore the five-day example <Icon name="arrow-right" /></Link></section>
  </PublicShell>;
}
