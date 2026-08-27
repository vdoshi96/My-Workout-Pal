export type SessionSignOutResponse = Readonly<{ authenticated: false }>;

export class SessionSignOutError extends Error {
  readonly code: "malformed_response";

  constructor() {
    super("The server did not confirm sign-out safely.");
    this.name = "SessionSignOutError";
    this.code = "malformed_response";
  }
}

export function parseSessionSignOutResponse(value: unknown): SessionSignOutResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !("authenticated" in value) ||
    value.authenticated !== false
  ) {
    throw new SessionSignOutError();
  }
  return { authenticated: false };
}

export async function performSessionSignOut(
  dependencies: Readonly<{
    clearOwner: (ownerUid: string) => Promise<void>;
    deleteServerSession: () => Promise<unknown>;
    signOutFirebase: () => Promise<void>;
  }>,
  ownerUid: string,
): Promise<void> {
  await dependencies.clearOwner(ownerUid);
  parseSessionSignOutResponse(await dependencies.deleteServerSession());
  await dependencies.signOutFirebase();
}
