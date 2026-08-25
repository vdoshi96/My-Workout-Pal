import { ProgramExplorer } from "@/components/program/program-explorer";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

type PageProps = {
  searchParams: Promise<{ equipment?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
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
