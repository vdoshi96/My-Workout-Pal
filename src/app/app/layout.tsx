import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { getCurrentViewer } from "@/server/auth/viewer";

export default async function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/sign-in?returnTo=%2Fapp");

  return <AuthenticatedShell viewer={viewer}>{children}</AuthenticatedShell>;
}
