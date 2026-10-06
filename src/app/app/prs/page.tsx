import { redirect } from "next/navigation";

import { PersonalRecordsView } from "@/components/insights/personal-records-view";
import { getDatabase } from "@/db/client";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadPersonalRecords } from "@/server/repositories/training-insights";

export const metadata = { title: "Personal records" };

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

type PageProps = Readonly<{ searchParams: Promise<{ from?: string | string[] }> }>;

export default async function PersonalRecordsPage({ searchParams }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const [{ profile, records }, query] = await Promise.all([loadRecordsPageData(viewer), searchParams]);
  const { timezone, unitSystem } = profile.preferences;
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app/progress", label: "Back to Progress" },
  });

  return (
    <PersonalRecordsView back={back} records={records} timezone={timezone} unitSystem={unitSystem} />
  );
}
