import { headers } from "next/headers";

import { ProgressInsightsView } from "@/components/insights/progress-insights-view";
import { loadProgressInsights } from "@/server/repositories/training-insights";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HarnessProgressPage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  const progress = await loadProgressInsights(database, context.viewer);
  return <ProgressInsightsView progress={progress} />;
}
