import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import type { FirebasePublicConfig } from "@/client/firebase";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { getCurrentViewer } from "@/server/auth/viewer";

function firebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = process.env["NEXT_PUBLIC_FIREBASE_API_KEY"];
  const appId = process.env["NEXT_PUBLIC_FIREBASE_APP_ID"];
  const authDomain = process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"];
  const projectId = process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
  return apiKey && appId && authDomain && projectId
    ? { apiKey, appId, authDomain, projectId }
    : null;
}

export default async function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/sign-in?returnTo=%2Fapp");

  return (
    <AuthenticatedShell firebaseConfig={firebasePublicConfig()} viewer={viewer}>
      {children}
    </AuthenticatedShell>
  );
}
