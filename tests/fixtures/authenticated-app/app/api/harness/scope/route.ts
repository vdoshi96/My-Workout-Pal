import { NextResponse, type NextRequest } from "next/server";

import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import { closeHarnessDatabase, getHarnessDatabase } from "../../../../server/database";
import { resetHarnessFaults } from "../../../../server/fault-injection";
import { harnessRequestContext } from "../../../../server/harness-context";

function unavailable() {
  return NextResponse.json(
    { error: "harness_unavailable", message: "The local harness is unavailable." },
    { headers: { "Cache-Control": "no-store" }, status: 404 },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  if (process.env["MWP_AUTHENTICATED_HARNESS"] !== "1") return unavailable();
  const context = harnessRequestContext(request.headers);
  if (!context.viewer) {
    return NextResponse.json(
      { error: "auth_required", message: "A synthetic viewer is required." },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }
  const { database } = await getHarnessDatabase(context.scope);
  const profileProgram = await getViewerProfileProgram(database, context.viewer);
  return NextResponse.json(
    { programs: profileProgram.programs.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest): Promise<Response> {
  if (process.env["MWP_AUTHENTICATED_HARNESS"] !== "1") return unavailable();
  const context = harnessRequestContext(request.headers);
  if (!context.viewer) {
    return NextResponse.json(
      { error: "auth_required", message: "A synthetic viewer is required." },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }
  await closeHarnessDatabase(context.scope);
  resetHarnessFaults(context.scope);
  return new Response(null, { headers: { "Cache-Control": "no-store" }, status: 204 });
}
