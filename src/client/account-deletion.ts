export type AccountDeletionClientUser = Readonly<{
  email: string | null;
  getIdToken: (forceRefresh: boolean) => Promise<string>;
  uid: string;
}>;

export type AccountDeletionClientDependencies = Readonly<{
  clearOwner: (ownerUid: string) => Promise<void>;
  deleteAccount: (input: Readonly<{
    confirmation: "DELETE";
    idempotencyKey: string;
  }>) => Promise<Readonly<{ status: string }>>;
  getCurrentUser: () => AccountDeletionClientUser | null;
  reauthenticateGoogle: (
    user: AccountDeletionClientUser,
  ) => Promise<AccountDeletionClientUser>;
  reauthenticatePassword: (
    user: AccountDeletionClientUser,
    email: string,
    password: string,
  ) => Promise<AccountDeletionClientUser>;
  refreshServerSession: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}>;

export type AccountDeletionClientCode =
  | "client_signout_failed"
  | "confirmation_required"
  | "identity_mismatch"
  | "identity_unavailable"
  | "local_cleanup_failed"
  | "password_required"
  | "provider_unsupported"
  | "server_unconfirmed";

export class AccountDeletionClientError extends Error {
  readonly accountDeleted: boolean;
  readonly code: AccountDeletionClientCode;

  constructor(
    code: AccountDeletionClientCode,
    message: string,
    accountDeleted = false,
  ) {
    super(message);
    this.name = "AccountDeletionClientError";
    this.accountDeleted = accountDeleted;
    this.code = code;
  }
}

export type AccountDeletionClientInput = Readonly<{
  confirmation: string;
  idempotencyKey: string;
  ownerUid: string;
  password: string;
  provider: "google" | "other" | "password";
}>;

function requireSameUser(
  user: AccountDeletionClientUser | null,
  ownerUid: string,
): AccountDeletionClientUser {
  if (!user) {
    throw new AccountDeletionClientError(
      "identity_unavailable",
      "Your Firebase session is unavailable. Sign in again before deleting the account.",
    );
  }
  if (user.uid !== ownerUid) {
    throw new AccountDeletionClientError(
      "identity_mismatch",
      "The active Firebase identity does not match this account.",
    );
  }
  return user;
}

export async function performAccountDeletion(
  dependencies: AccountDeletionClientDependencies,
  input: AccountDeletionClientInput,
): Promise<void> {
  if (input.confirmation !== "DELETE" || input.idempotencyKey.trim().length === 0) {
    throw new AccountDeletionClientError(
      "confirmation_required",
      "Type DELETE exactly before continuing.",
    );
  }

  const currentUser = requireSameUser(dependencies.getCurrentUser(), input.ownerUid);
  let reauthenticatedUser: AccountDeletionClientUser;
  if (input.provider === "password") {
    const email = currentUser.email?.trim();
    if (!email || input.password.length === 0) {
      throw new AccountDeletionClientError(
        "password_required",
        "Enter the current password for this account.",
      );
    }
    reauthenticatedUser = await dependencies.reauthenticatePassword(
      currentUser,
      email,
      input.password,
    );
  } else if (input.provider === "google") {
    reauthenticatedUser = await dependencies.reauthenticateGoogle(currentUser);
  } else {
    throw new AccountDeletionClientError(
      "provider_unsupported",
      "This sign-in provider cannot delete the account yet.",
    );
  }

  const verifiedUser = requireSameUser(reauthenticatedUser, input.ownerUid);
  const idToken = await verifiedUser.getIdToken(true);
  await dependencies.refreshServerSession(idToken);
  const deletion = await dependencies.deleteAccount({
    confirmation: "DELETE",
    idempotencyKey: input.idempotencyKey,
  });
  if (deletion.status !== "completed") {
    throw new AccountDeletionClientError(
      "server_unconfirmed",
      "The server did not confirm completed account deletion.",
    );
  }

  let cleanupFailed = false;
  try {
    await dependencies.clearOwner(input.ownerUid);
  } catch {
    cleanupFailed = true;
  }

  try {
    await dependencies.signOut();
  } catch {
    throw new AccountDeletionClientError(
      "client_signout_failed",
      "The account is deleted, but Firebase client sign-out did not finish. Close this tab and clear site data.",
      true,
    );
  }

  if (cleanupFailed) {
    throw new AccountDeletionClientError(
      "local_cleanup_failed",
      "The account is deleted and signed out, but local workout drafts could not be cleared. Clear this site's stored data.",
      true,
    );
  }
}
