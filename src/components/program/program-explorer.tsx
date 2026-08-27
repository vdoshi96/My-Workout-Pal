"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import type { Program } from "@/domain/programs/types";

type Props = Readonly<{
  dumbbellProgram: Program;
  barbellProgram: Program;
  initialProfile: EquipmentProfileKind;
}>;

export function ProgramExplorer({ dumbbellProgram, barbellProgram, initialProfile }: Props) {
  const [profile, setProfile] = useState<EquipmentProfileKind>(initialProfile);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const program = profile === "dumbbells" ? dumbbellProgram : barbellProgram;
  const selectedDay = program.days[selectedIndex] ?? program.days[0]!;
  const selectedSlug = selectedDay.name.toLowerCase();

  const substitutionCount = useMemo(() => {
    const other = profile === "dumbbells" ? barbellProgram : dumbbellProgram;
    return program.days.reduce((total, day, index) => {
      const otherDay = other.days[index];
      if (!otherDay) return total;
      return total + day.exerciseSlugs.filter((slug, movementIndex) => slug !== otherDay.exerciseSlugs[movementIndex]).length;
    }, 0);
  }, [barbellProgram, dumbbellProgram, profile, program.days]);

  function chooseProfile(nextProfile: EquipmentProfileKind) {
    if (nextProfile === profile) return;
    setProfile(nextProfile);
    const label = EQUIPMENT_PROFILES[nextProfile].label;
    setAnnouncement(`${label} preview selected. ${substitutionCount} route changes are shown. The starter preview is not saved.`);
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#selected-day-sheet">Skip to selected day</a>

      <header className="app-header">
        <Link className="brand" href="/" prefetch={false}>
          <span className="brand-mark" aria-hidden="true"><Icon name="map" /></span>
          <span>
            <h1>My Workout Pal</h1>
            <small>Your equipment-aware training route</small>
          </span>
        </Link>
        <nav className="app-nav" aria-label="Primary">
          <Link aria-current="page" href="/program" prefetch={false}><Icon name="map" /><span>Program</span></Link>
          <Link href="/library" prefetch={false}><Icon name="library" /><span>Library</span></Link>
          <Link href="/sample-progress" prefetch={false}><Icon name="sample" /><span>Sample</span></Link>
          <Link href="/app" prefetch={false}><Icon name="sign-in" /><span>My workouts</span></Link>
        </nav>
        <Link className="account-link" href="/app" prefetch={false}>
          <Icon name="sign-in" />
          <span>My workouts</span>
        </Link>
      </header>

      <main>
        <section className="equipment-panel" aria-labelledby="equipment-heading">
          <div>
            <h2 id="equipment-heading">Choose your equipment</h2>
            <p>Preview substitutions before you create an account.</p>
          </div>
          <div className="equipment-control" role="group" aria-label="Equipment preview">
            {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profileId) => (
              <button
                aria-pressed={profile === profileId}
                key={profileId}
                onClick={() => chooseProfile(profileId)}
                type="button"
              >
                <Icon name="dumbbell" />
                <span>{EQUIPMENT_PROFILES[profileId].label}</span>
              </button>
            ))}
          </div>
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>

        <section className="atlas-grid" aria-labelledby="route-heading">
          <div className="route-map contour-surface">
            <div className="map-legend">
              <span><i className="route-swatch" /> Starter route</span>
              <span><i className="alternate-swatch" /> Equipment change</span>
            </div>
            <div className="route-heading">
              <h2 id="route-heading">Five-day starter example</h2>
              <p>Strength, core, and walker or runner cardio every day.</p>
            </div>
            <svg className="route-lines" viewBox="0 0 600 700" aria-hidden="true" preserveAspectRatio="none">
              <path className="route-path" d="M278 70 C390 70 450 145 455 205 C465 310 485 330 470 405 C455 510 400 560 330 565 C220 570 120 535 105 445 C92 350 150 290 250 255 C310 235 315 125 278 70Z" />
              <path className="alternate-path" d="M455 205 C350 270 285 360 330 565" />
            </svg>
            <ol className={`waypoints route-${profile}`}>
              {program.days.map((day, index) => (
                <li className={`waypoint-${index + 1}`} key={day.name}>
                  <button
                    aria-current={selectedIndex === index ? "step" : undefined}
                    onClick={() => setSelectedIndex(index)}
                    type="button"
                  >
                    <strong>{index + 1}</strong>
                    <span>{day.name}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="guest-map-stamp">Starter preview · not saved</div>
          </div>

          <section
            aria-labelledby="selected-day-heading"
            className="route-sheet selected-day"
            id="selected-day-sheet"
            tabIndex={-1}
          >
            <header>
              <span className="selected-number" aria-hidden="true">{selectedIndex + 1}</span>
              <div>
                <h2 id="selected-day-heading">{selectedDay.name} day</h2>
                <p>{selectedDay.prescriptions.length} movements + cardio</p>
              </div>
              <span className="equipment-stamp"><Icon name="dumbbell" />{EQUIPMENT_PROFILES[profile].label}</span>
            </header>
            <ol className="movement-preview">
              {selectedDay.prescriptions.slice(0, 3).map((prescription, index) => (
                <li key={prescription.exerciseSlug}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{prescription.displayName ?? getCatalogExercise(prescription.exerciseSlug).name}</strong>
                    <small>{prescription.sets} sets · {prescription.minimumReps ?? prescription.minimumSeconds}–{prescription.maximumReps ?? prescription.maximumSeconds}{prescription.minimumSeconds ? " sec" : " reps"}</small>
                  </div>
                </li>
              ))}
            </ol>
            <div className="remaining-movements">
              + {selectedDay.prescriptions.length - 3} more movements · walker or runner
            </div>
            <Link
              className="primary-action"
              href={`/program/${selectedSlug}?equipment=${profile}`}
              prefetch={false}
            >
              Open {selectedDay.name} day
              <Icon name="arrow-right" />
            </Link>
            <p className="temporary-note">All five days, exercise guides, and both approved videos are open to guests. Sign in only to customize, track, or save.</p>
          </section>
        </section>
      </main>
    </div>
  );
}
