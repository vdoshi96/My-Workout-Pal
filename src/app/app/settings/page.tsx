import { redirect } from "next/navigation";

import type { FirebasePublicConfig } from "@/client/firebase";
import { SettingsForm } from "@/components/settings/settings-form";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function firebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = process.env["NEXT_PUBLIC_FIREBASE_API_KEY"];
  const appId = process.env["NEXT_PUBLIC_FIREBASE_APP_ID"];
  const authDomain = process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"];
  const projectId = process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
  return apiKey && appId && authDomain && projectId
    ? { apiKey, appId, authDomain, projectId }
    : null;
}

async function loadSettings() {
  const viewer = await getCurrentViewer();
  if (!viewer) return undefined;
  try {
    const model = await getViewerProfileProgram(getDatabase(), viewer);
    return { model, viewer };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function SettingsPage() {
  const data = await loadSettings();
  if (!data?.model.activeProgram) redirect("/app");
  return (
    <SettingsForm
      canMutate={data.viewer.eligibleForPermanentMutations}
      equipmentProfileKind={data.model.equipment.profileKind}
      firebaseConfig={firebasePublicConfig()}
      initialPreferences={data.model.preferences}
      ownerUid={data.model.profile.firebaseUid}
      viewerProvider={data.viewer.provider}
    />
  );
}
