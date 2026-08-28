import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Your customizable workout companion",
  description:
    "Plan your own routine with a workout companion for guidance, logging, history, and progress. Explore the five-day starter example without an account.",
};

const starterDays = ["Push", "Pull", "Legs", "Upper", "Lower"] as const;
const heroImageAlt = "A lively hand-drawn cartoon gym where animal workout pals run, lift dumbbells, stretch, drink water, and train together.";

export default function HomePage() {
  return (
    <PublicShell current="home">
      <section className="landing-hero" aria-labelledby="landing-heading">
        <div className="landing-copy">
          <p className="landing-welcome">Welcome to My Workout Pal</p>
          <h1 id="landing-heading">A workout companion built around your routine.</h1>
          <p className="landing-lede">
            Plan your days, use guidance while you train, log your work, and review progress
            in one personal place. Explore an unsaved starter example before deciding whether
            you want an account.
          </p>
          <div className="landing-actions">
            <Link className="primary-action" href="/program">
              Explore the five-day example
              <Icon name="arrow-right" />
            </Link>
            <Link className="landing-text-link" href="#account-choice">
              Why would I sign in?
            </Link>
          </div>
          <p className="landing-assurance">
            Five-day starter example · not saved
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
          <h2 id="starter-route-heading">One example, ready to inspect</h2>
          <p>
            This five-day starter shows strength, core, and walker or runner cardio. It is
            not a promise about the routine you must use; signed-in routines can follow
            the days and movements that fit you.
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
          <h2 id="account-choice-heading">Explore first. Build your own when you’re ready.</h2>
          <p>
            Signing in is optional for exploring the example. It is required only when
            your companion needs to remember a routine, workout, or preference that belongs to you.
          </p>
        </header>

        <div className="landing-choice-grid">
          <section aria-labelledby="guest-capabilities-heading">
            <h3 id="guest-capabilities-heading">Open to everyone</h3>
            <ul>
              <li>A five-day starter example in both equipment profiles</li>
              <li>Every exercise instruction and both approved videos</li>
              <li>The searchable exercise library</li>
              <li>A read-only sample workout and a disclosed Progress preview</li>
            </ul>
            <Link href="/program">Explore the starter example <Icon name="arrow-right" /></Link>
          </section>

          <section aria-labelledby="account-capabilities-heading">
            <h3 id="account-capabilities-heading">Sign in to make it yours</h3>
            <ul>
              <li>Shape routine days, movements, targets, notes, and rest periods</li>
              <li>Add, replace, or create exercises and routines</li>
              <li>Track workouts and resume interrupted sessions</li>
              <li>Keep history, records, preferences, and personal analytics</li>
            </ul>
            <Link href="/app" prefetch={false}>
              Open my workouts <Icon name="arrow-right" />
            </Link>
            <Link href="/progress" prefetch={false}>
              Preview Progress <Icon name="arrow-right" />
            </Link>
          </section>
        </div>
      </section>
    </PublicShell>
  );
}
