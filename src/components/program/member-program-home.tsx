"use client";

import Link from "next/link";
import { useState } from "react";

import { EquipmentProfileControl } from "@/components/program/equipment-profile-control";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";

export function MemberProgramHome({
  canMutate,
  initialProgram,
}: Readonly<{
  canMutate: boolean;
  initialProgram: ActiveProgramReadModel;
}>) {
  const [program, setProgram] = useState(initialProgram);
  const dayCountLabel = `${program.days.length} ${program.days.length === 1 ? "day" : "days"}`;

  return (
    <section className="member-program" aria-labelledby="member-program-title">
      <header className="member-program-hero contour-surface">
        <div>
          <span className="eyebrow">Active published program</span>
          <h1 id="member-program-title">{program.name}</h1>
          <p>
            Revision {program.revisionNumber} · {EQUIPMENT_PROFILES[program.equipmentProfileKind].label} · {dayCountLabel}
          </p>
        </div>
        <div className="member-program-actions">
          <Link className="secondary-action" href="/app/programs">
            <Icon name="map" /> Manage programs
          </Link>
          <Link className="secondary-action" href="/app/program/edit">
            <Icon name="settings" /> Edit program
          </Link>
          <Link className="secondary-action" href="/app/library/custom">
            <Icon name="library" /> Private exercises
          </Link>
        </div>
      </header>

      <section className="member-week" aria-labelledby="member-week-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Current route</span>
            <h2 id="member-week-title">Choose a training day</h2>
          </div>
          <span>{program.days.length} days</span>
        </div>
        <ol className="member-day-grid">
          {program.days.map((day) => (
            <li key={day.id}>
              <Link href={`/app/program/${day.dayKey}`} prefetch={false}>
                <span>{String(day.dayNumber).padStart(2, "0")}</span>
                <strong>{day.displayName}</strong>
                <small>
                  {day.prescriptions.length} movements · {day.cardio.length === 0
                    ? "no cardio"
                    : `${day.cardio.length} cardio option${day.cardio.length === 1 ? "" : "s"}`}
                </small>
                <Icon name="chevron-right" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <EquipmentProfileControl
        canMutate={canMutate}
        onSaved={(nextProgram) => setProgram(nextProgram)}
        program={program}
      />
    </section>
  );
}
