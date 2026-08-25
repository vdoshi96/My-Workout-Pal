import { ProgramExplorer } from "@/components/program/program-explorer";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

export default function HomePage() {
  const dumbbellProgram = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);
  const barbellProgram = createStarterProgram(EQUIPMENT_PROFILES.barbell);

  return (
    <ProgramExplorer
      barbellProgram={barbellProgram}
      dumbbellProgram={dumbbellProgram}
      initialProfile="dumbbells"
    />
  );
}
