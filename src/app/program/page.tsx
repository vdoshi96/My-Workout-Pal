import type { Metadata } from "next";

import { ProgramExplorer } from "@/components/program/program-explorer";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

export const metadata: Metadata = {
  title: "Free five-day program",
  description:
    "Browse every Push, Pull, Legs, Upper, and Lower workout with dumbbells or a barbell setup—no account required.",
};

type PageProps = {
  searchParams: Promise<{ equipment?: string }>;
};

export default async function ProgramPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const dumbbellProgram = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);
  const barbellProgram = createStarterProgram(EQUIPMENT_PROFILES.barbell);

  return (
    <ProgramExplorer
      barbellProgram={barbellProgram}
      dumbbellProgram={dumbbellProgram}
      initialProfile={query.equipment === "barbell" ? "barbell" : "dumbbells"}
    />
  );
}
