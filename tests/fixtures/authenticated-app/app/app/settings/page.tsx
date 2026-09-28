import { headers } from "next/headers";

import { SettingsForm } from "@/components/settings/settings-form";
import { timeZoneOptions } from "@/domain/time-zones";
import { getViewerProfileProgram, RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";

export const metadata = { title: "Settings" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fixtureFirebasePublicConfig = {
  apiKey: "fixture-public-api-key-not-a-credential",
  appId: "1:000000000000:web:fixture-auth-readiness",
  authDomain: "fixture.invalid",
  projectId: "fixture-project",
} as const;

export default async function HarnessSettingsPage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  let model;
  try {
    model = await getViewerProfileProgram(database, context.viewer);
  } catch (error) {
    if (!(error instanceof RepositoryNotFoundError)) throw error;
  }

  return (
    <SettingsForm
      activeProgram={model?.activeProgram ?? null}
      canMutate={context.viewer.eligibleForPermanentMutations}
      equipmentProfileKind={model?.equipment.profileKind ?? null}
      firebaseConfig={
        context.scenario === "firebase-client-missing"
          ? fixtureFirebasePublicConfig
          : null
      }
      initialFirebaseIdentityState={{ status: "ready" }}
      initialPreferences={model?.preferences ?? null}
      timeZones={timeZoneOptions(model?.preferences?.timezone)}
      ownerUid={context.viewer.uid}
      viewerProvider={context.viewer.provider}
      viewerIdentity={{ displayName: context.viewer.displayName, email: context.viewer.email, emailVerified: context.viewer.emailVerified }}
    />
  );
}
