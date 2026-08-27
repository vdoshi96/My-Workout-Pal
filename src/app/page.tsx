import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Your free five-day workout plan",
  description:
    "Browse every starter workout, exercise guide, and approved demonstration without an account. Sign in only when you want to customize or track.",
};

const starterDays = ["Push", "Pull", "Legs", "Upper", "Lower"] as const;
const heroImageAlt = "A lively hand-drawn cartoon gym where animal workout pals run, lift dumbbells, stretch, drink water, and train together.";

export default function HomePage() {
  return (
    <PublicShell current="home">
      <section className="landing-hero" aria-labelledby="landing-heading">
        <div className="landing-copy">
          <p className="landing-welcome">Welcome to My Workout Pal</p>
          <h1 id="landing-heading">Your whole five-day plan. No account required.</h1>
          <p className="landing-lede">
            Open every workout day, read every exercise guide, and choose between two
            approved demonstrations for each movement. Start with dumbbells, or preview
            the barbell route—everything public stays free to browse.
          </p>
          <div className="landing-actions">
            <Link className="primary-action" href="/program">
              Browse all five days
              <Icon name="arrow-right" />
            </Link>
            <Link className="landing-text-link" href="#account-choice">
              Why would I sign in?
            </Link>
          </div>
          <p className="landing-assurance">
            Guest exploration is temporary and never presented as saved activity.
          </p>
        </div>

        <figure className="landing-scene">
          {/* The explicit precached source keeps the illustration available offline.
              Native rendering also avoids Next's inline style under the nonce CSP. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={heroImageAlt}
            decoding="async"
            height={1024}
            loading="lazy"
            sizes="(max-width: 63.99rem) calc(100vw - 2rem), 55vw"
            src="/illustrations/workout-pals-gym.webp"
            srcSet="/illustrations/workout-pals-gym-768.webp 768w, /illustrations/workout-pals-gym.webp 1536w"
            width={1536}
          />
          <figcaption>
            Every workout pal has their own pace, equipment, and way into the week.
          </figcaption>
        </figure>
      </section>

      <section className="landing-route" aria-labelledby="starter-route-heading">
        <div>
          <p className="landing-section-number" aria-hidden="true">01</p>
          <h2 id="starter-route-heading">A complete week, ready to inspect</h2>
          <p>
            Strength, core, and configurable walker or runner cardio are included every
            day. Switch equipment previews without creating an account.
          </p>
        </div>
        <ol aria-label="Five starter workout days">
          {starterDays.map((day, index) => (
            <li key={day}>
              <Link
                href={`/program/${day.toLowerCase()}?equipment=dumbbells`}
                prefetch={false}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{day}</strong>
                <Icon name="chevron-right" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-choice" id="account-choice" aria-labelledby="account-choice-heading">
        <header>
          <p className="landing-section-number" aria-hidden="true">02</p>
          <h2 id="account-choice-heading">Browse first. Make it yours when you’re ready.</h2>
          <p>
            Signing in is optional for learning the plan. It is only required when the
            app needs to remember something that belongs to you.
          </p>
        </header>

        <div className="landing-choice-grid">
          <section aria-labelledby="guest-capabilities-heading">
            <h3 id="guest-capabilities-heading">Open to everyone</h3>
            <ul>
              <li>All five starter days in both equipment profiles</li>
              <li>Every exercise instruction and both approved videos</li>
              <li>The searchable exercise library</li>
              <li>Read-only sample workout and clearly labeled sample analytics</li>
            </ul>
            <Link href="/program">Explore the free program <Icon name="arrow-right" /></Link>
          </section>

          <section aria-labelledby="account-capabilities-heading">
            <h3 id="account-capabilities-heading">Sign in to make it yours</h3>
            <ul>
              <li>Change sets, targets, weights, notes, and rest periods</li>
              <li>Add, replace, or create exercises and programs</li>
              <li>Track workouts and resume interrupted sessions</li>
              <li>Keep history, records, preferences, and personal analytics</li>
            </ul>
            <Link href="/app" prefetch={false}>
              Open my workouts <Icon name="arrow-right" />
            </Link>
          </section>
        </div>
      </section>
    </PublicShell>
  );
}
