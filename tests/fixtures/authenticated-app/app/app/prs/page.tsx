import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PersonalRecordsView } from "@/components/insights/personal-records-view";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadPersonalRecords } from "@/server/repositories/training-insights";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";

export const metadata = { title: "Personal records" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadRecordsPageData(
  scope: string,
  viewer: NonNullable<ReturnType<typeof harnessRequestContext>["viewer"]>,
) {
  const { database } = await getHarnessDatabase(scope);
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

export default async function HarnessPersonalRecordsPage({ searchParams }: PageProps) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const [{ profile, records }, query] = await Promise.all([
    loadRecordsPageData(context.scope, context.viewer),
    searchParams,
  ]);
  if (!profile.activeProgram) redirect("/app");
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app/progress", label: "Back to Progress" },
  });
  return (
    <PersonalRecordsView
      back={back}
      records={records}
      timezone={profile.preferences.timezone}
      unitSystem={profile.preferences.unitSystem}
    />
  );
}
