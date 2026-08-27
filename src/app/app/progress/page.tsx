import { ProgressInsightsView } from "@/components/insights/progress-insights-view";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { loadProgressInsights } from "@/server/repositories/training-insights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProgressPage() {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const progress = await loadProgressInsights(getDatabase(), viewer);
  return <ProgressInsightsView progress={progress} />;
}
