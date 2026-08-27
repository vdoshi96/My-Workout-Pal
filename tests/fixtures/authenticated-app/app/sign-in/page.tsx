import Link from "next/link";

import { normalizeReturnPath } from "@/server/navigation/return-path";

const WORKOUT_RETURN_PATTERN =
  /^\/workout\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function normalizeHarnessWorkoutReturn(
  value: string | readonly string[] | undefined,
): string {
  const normalized = normalizeReturnPath(value);
  return WORKOUT_RETURN_PATTERN.test(normalized) ? normalized : "/app";
}

export default async function HarnessSignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ returnTo?: string | string[] }>;
}>) {
  const { returnTo } = await searchParams;
  const destination = normalizeHarnessWorkoutReturn(returnTo);

  return (
    <main className="owned-workout-route">
      <section
        aria-labelledby="harness-reauthentication-title"
        className="owned-runner-recovery owned-runner-recovery--blocked"
      >
        <span className="eyebrow">Local authenticated QA harness</span>
        <h1 id="harness-reauthentication-title">
          Synthetic reauthentication boundary
        </h1>
        <p>
          This fixture does not imitate a provider. The browser harness chooses
          one fixed server viewer before the return request so the production
          workout recovery path can be tested without credentials.
        </p>
        <Link className="primary-action" href={destination} prefetch={false}>
          Return as the current synthetic viewer
        </Link>
      </section>
    </main>
  );
}
