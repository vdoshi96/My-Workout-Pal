export type FirebaseClientIdentity = Readonly<{
  uid: string;
}>;

export type FirebaseClientIdentityState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready" }>
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "mismatch" }>
  | Readonly<{ status: "unavailable" }>;

export type FirebaseClientAuthReadiness = Readonly<{
  getCurrentUser: () => FirebaseClientIdentity | null;
  waitForInitialState: () => Promise<void>;
}>;

const unavailableState = { status: "unavailable" } as const;

export function classifyFirebaseClientIdentity(
  currentUser: FirebaseClientIdentity | null,
  ownerUid: string,
): FirebaseClientIdentityState {
  if (!currentUser) return { status: "missing" };
  return currentUser.uid === ownerUid
    ? { status: "ready" }
    : { status: "mismatch" };
}

export async function resolveFirebaseClientIdentity(
  readiness: FirebaseClientAuthReadiness,
  ownerUid: string,
  timeoutMs = 5_000,
): Promise<FirebaseClientIdentityState> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      readiness.waitForInitialState().then(
        () => "settled" as const,
        () => "unavailable" as const,
      ),
      new Promise<"unavailable">((resolve) => {
        timeoutId = setTimeout(() => resolve("unavailable"), timeoutMs);
      }),
    ]);

    if (outcome !== "settled") return unavailableState;
    return classifyFirebaseClientIdentity(readiness.getCurrentUser(), ownerUid);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
