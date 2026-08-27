import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/settings/settings-form";
import { getViewerProfileProgram, RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HarnessSettingsPage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  let model;
  try {
    model = await getViewerProfileProgram(database, context.viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) redirect("/app");
    throw error;
  }
  if (!model.activeProgram) redirect("/app");

  return (
    <SettingsForm
      canMutate={context.viewer.eligibleForPermanentMutations}
      equipmentProfileKind={model.equipment.profileKind}
      firebaseConfig={null}
      initialPreferences={model.preferences}
      ownerUid={model.profile.firebaseUid}
      viewerProvider={context.viewer.provider}
    />
  );
}
