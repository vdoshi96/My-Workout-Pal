import Link from "next/link";

import { normalizeHarnessWorkoutReturn } from "../../server/harness-workout-return";

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
