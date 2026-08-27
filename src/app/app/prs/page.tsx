import { redirect } from "next/navigation";

import { PersonalRecordsView } from "@/components/insights/personal-records-view";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadPersonalRecords } from "@/server/repositories/training-insights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadRecordsPageData(
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
) {
  const database = getDatabase();
  try {
    const [profile, records] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadPersonalRecords(database, viewer),
    ]);
    if (!profile.activeProgram) redirect("/app");
    return { profile, records };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) redirect("/app");
    throw error;
  }
}

export default async function PersonalRecordsPage() {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const { profile, records } = await loadRecordsPageData(viewer);
  const { timezone, unitSystem } = profile.preferences;

  return (
    <PersonalRecordsView records={records} timezone={timezone} unitSystem={unitSystem} />
  );
}
