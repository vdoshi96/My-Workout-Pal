import { headers } from "next/headers";

import { MemberProgramHome } from "@/components/program/member-program-home";
import { OnboardingForm } from "@/components/program/onboarding-form";
import type { Database } from "@/db/client";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { getHarnessDatabase } from "../../server/database";
import { harnessRequestContext } from "../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readProfileProgramOrUndefined(database: Database, viewer: ViewerContext) {
  try {
    return await getViewerProfileProgram(database, viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function HarnessMemberHomePage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  const model = await readProfileProgramOrUndefined(database, context.viewer);
  if (!model?.activeProgram) {
    return <OnboardingForm canMutate={context.viewer.eligibleForPermanentMutations} />;
  }
  return (
    <MemberProgramHome
      canMutate={context.viewer.eligibleForPermanentMutations}
      initialProgram={model.activeProgram}
    />
  );
}
