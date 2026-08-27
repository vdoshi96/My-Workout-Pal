import { normalizeReturnPath } from "@/server/navigation/return-path";

const WORKOUT_RETURN_PATTERN =
  /^\/workout\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function normalizeHarnessWorkoutReturn(
  value: string | readonly string[] | undefined,
): string {
  const normalized = normalizeReturnPath(value);
  return WORKOUT_RETURN_PATTERN.test(normalized) ? normalized : "/app";
}
