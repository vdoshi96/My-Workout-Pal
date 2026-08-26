export default async function HarnessUnimplementedSurface({
  params,
}: Readonly<{ params: Promise<{ path: string[] }> }>) {
  const { path } = await params;
  return (
    <section className="member-empty contour-surface" aria-labelledby="harness-surface-title">
      <span className="eyebrow">Local QA boundary</span>
      <h1 id="harness-surface-title">Authenticated surface not mounted in this slice</h1>
      <p>
        The production navigation target <code>/app/{path.join("/")}</code> is intentionally outside
        the onboarding harness slice. No success state or saved data is simulated here.
      </p>
    </section>
  );
}
