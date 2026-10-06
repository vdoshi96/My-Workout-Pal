import { use } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneArt, SceneStage } from "@/components/ui/scene-stage";

export const metadata: Metadata = {
  title: "Your new gym buddy",
  description: "Plan your routine, log every set, watch a quick demo when you need one, and see your gains add up. Take a test drive without an account.",
};

const pillars = [
  {
    art: "beaver-plan",
    title: "Set your routine",
    copy: "Tell us your goal, your week and your gear. You get a routine that fits, and you can change anything.",
    peek: <span className="pal-peek"><span className="pal-chip pal-chip--selected"><Icon name="check" />Day 1 · Full body</span><span className="pal-chip">Day 2 · Full body</span></span>,
  },
  {
    art: "pip-recover",
    title: "Track every set",
    copy: "Log weight and reps in a tap. Your rest timer starts on its own, and your next set is waiting.",
    peek: <span className="pal-peek"><span className="pal-chip">Goblet squat · Set 2</span><span className="pal-chip pal-chip--sun"><Icon name="check" />25 lb × 10</span></span>,
  },
  {
    art: "otter-study",
    title: "Watch a quick demo",
    copy: "Not sure how a move goes? A short demo opens right where you are, then you're straight back to your set.",
    peek: <span className="pal-peek"><span className="pal-chip"><Icon name="play" />Watch demo</span></span>,
  },
  {
    art: "tortoise-review",
    title: "See your gains",
    copy: "Every workout adds up. Watch your totals climb and celebrate each new record.",
    peek: <span className="pal-bars" aria-hidden="true"><span /><span /><span /><span /><span /></span>,
  },
] as const;

export default function HomePage({ searchParams }: { searchParams?: Promise<{ account?: string }> }) {
  const query = searchParams ? use(searchParams) : {};
  return <PublicShell current="home" tone="pal">
    <SceneStage priority />
    <section className="pal-hero" aria-labelledby="landing-heading">
      <div className="pal-hero__copy">
        {query.account === "deleted" ? <p className="pal-notice" role="status">Your account and workout data were deleted.</p> : null}
        <h1 id="landing-heading">Your new <em>gym buddy.</em></h1>
        <p>Plan your routine, log every set, watch a quick demo when you need one, and see your gains add up.</p>
        <div className="pal-actions">
          <Link className="pal-button pal-button--sun" href="/try">Take a test drive <Icon name="arrow-right" /></Link>
          <Link className="pal-button pal-button--ghost" href="/app" prefetch={false}>Make my routine</Link>
        </div>
        <p className="pal-note">No account needed for the test drive.</p>
      </div>
    </section>
    <section className="pal-pillars" aria-labelledby="pillars-title">
      <h2 className="pal-section-title" id="pillars-title">Everything you need, between sets</h2>
      <p className="pal-section-lead">Your pal keeps your plan, your sets, your demos and your progress in one place.</p>
      <ol>
        {pillars.map((pillar) => <li className="pal-pillar" key={pillar.title}>
          <div className="pal-vignette" aria-hidden="true">
            <SceneArt base={`/illustrations/quiet-set/${pillar.art}`} dusk={`/illustrations/quiet-set/${pillar.art}-dusk`} sizes="(max-width: 700px) 112px, 168px" />
          </div>
          <div>
            <h3>{pillar.title}</h3>
            <p>{pillar.copy}</p>
            <div aria-hidden="true">{pillar.peek}</div>
          </div>
        </li>)}
      </ol>
    </section>
    <section className="pal-closer" aria-labelledby="closer-title">
      <PalSticker pose="ready" />
      <div>
        <h2 id="closer-title">Ready when you are.</h2>
        <p>Try a short workout with demos right now. Nothing to sign up for.</p>
        <div className="pal-actions">
          <Link className="pal-button pal-button--sun" href="/try">Take a test drive <Icon name="arrow-right" /></Link>
          <Link href="/program">Peek at a five-day routine</Link>
        </div>
      </div>
    </section>
  </PublicShell>;
}
