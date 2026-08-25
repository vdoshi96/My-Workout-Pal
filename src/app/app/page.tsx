import { getDatabase } from "@/db/client";
import { MemberProgramHome } from "@/components/program/member-program-home";
import { OnboardingForm } from "@/components/program/onboarding-form";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readProfileProgramOrUndefined(
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
) {
  try {
    return await getViewerProfileProgram(getDatabase(), viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function MemberHomePage() {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const model = await readProfileProgramOrUndefined(viewer);
  if (!model?.activeProgram) {
    return <OnboardingForm canMutate={viewer.eligibleForPermanentMutations} />;
  }
  return (
    <MemberProgramHome
      canMutate={viewer.eligibleForPermanentMutations}
      initialProgram={model.activeProgram}
    />
  );
}
