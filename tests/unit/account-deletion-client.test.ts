import { describe, expect, it, vi } from "vitest";

import {
  performAccountDeletion,
  type AccountDeletionClientDependencies,
  type AccountDeletionClientUser,
} from "@/client/account-deletion";

const alice: AccountDeletionClientUser = {
  email: "alice@example.test",
  getIdToken: vi.fn().mockResolvedValue("fresh-id-token"),
  uid: "alice",
};

function dependencies(
  overrides: Partial<AccountDeletionClientDependencies> = {},
): AccountDeletionClientDependencies {
  return {
    clearOwner: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue({ status: "completed" }),
    getCurrentUser: vi.fn().mockReturnValue(alice),
    reauthenticateGoogle: vi.fn().mockResolvedValue(alice),
    reauthenticatePassword: vi.fn().mockResolvedValue(alice),
    refreshServerSession: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("account deletion client orchestration", () => {
  it("requires the exact confirmation before reading Firebase state", async () => {
    const deps = dependencies();

    await expect(performAccountDeletion(deps, {
      confirmation: "delete",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "password123",
      provider: "password",
    })).rejects.toMatchObject({ code: "confirmation_required" });

    expect(deps.getCurrentUser).not.toHaveBeenCalled();
  });

  it("reauthenticates password accounts and completes cleanup in irreversible order", async () => {
    const order: string[] = [];
    const deps = dependencies({
      clearOwner: vi.fn(async () => { order.push("clear-owner"); }),
      deleteAccount: vi.fn(async () => { order.push("delete-account"); return { status: "completed" }; }),
      reauthenticatePassword: vi.fn(async () => { order.push("reauth-password"); return alice; }),
      refreshServerSession: vi.fn(async () => { order.push("refresh-session"); }),
      signOut: vi.fn(async () => { order.push("sign-out"); }),
    });

    await performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "password123",
      provider: "password",
    });

    expect(deps.reauthenticatePassword).toHaveBeenCalledWith(alice, "alice@example.test", "password123");
    expect(deps.refreshServerSession).toHaveBeenCalledWith("fresh-id-token");
    expect(deps.deleteAccount).toHaveBeenCalledWith({ confirmation: "DELETE", idempotencyKey: "delete-once" });
    expect(deps.clearOwner).toHaveBeenCalledWith("alice");
    expect(order).toEqual(["reauth-password", "refresh-session", "delete-account", "clear-owner", "sign-out"]);
  });

  it("uses Google reauthentication without accepting a mismatched returned UID", async () => {
    const deps = dependencies({
      reauthenticateGoogle: vi.fn().mockResolvedValue({ ...alice, uid: "bob" }),
    });

    await expect(performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "",
      provider: "google",
    })).rejects.toMatchObject({ code: "identity_mismatch" });

    expect(deps.refreshServerSession).not.toHaveBeenCalled();
    expect(deps.deleteAccount).not.toHaveBeenCalled();
  });

  it("keeps local drafts and client identity when the server does not confirm deletion", async () => {
    const deps = dependencies({
      deleteAccount: vi.fn().mockRejectedValue(new Error("identity deletion pending")),
    });

    await expect(performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "",
      provider: "google",
    })).rejects.toThrow("identity deletion pending");

    expect(deps.clearOwner).not.toHaveBeenCalled();
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it("stops before session refresh when provider reauthentication is cancelled", async () => {
    const cancelled = { code: "auth/popup-closed-by-user" };
    const deps = dependencies({
      reauthenticateGoogle: vi.fn().mockRejectedValue(cancelled),
    });

    await expect(performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "",
      provider: "google",
    })).rejects.toBe(cancelled);

    expect(deps.refreshServerSession).not.toHaveBeenCalled();
    expect(deps.deleteAccount).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed success-shaped response without cleanup", async () => {
    const deps = dependencies({
      deleteAccount: vi.fn().mockResolvedValue({ status: "identity_deletion_failed" }),
    });

    await expect(performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "",
      provider: "google",
    })).rejects.toMatchObject({ code: "server_unconfirmed" });

    expect(deps.clearOwner).not.toHaveBeenCalled();
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it("still signs out after confirmed deletion when local cleanup fails", async () => {
    const deps = dependencies({
      clearOwner: vi.fn().mockRejectedValue(new Error("private IndexedDB detail")),
    });

    await expect(performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "",
      provider: "google",
    })).rejects.toEqual(expect.objectContaining({
      accountDeleted: true,
      code: "local_cleanup_failed",
    }));

    expect(deps.signOut).toHaveBeenCalledOnce();
  });

  it("reports client sign-out failure as post-deletion cleanup without replaying deletion", async () => {
    const deps = dependencies({
      signOut: vi.fn().mockRejectedValue(new Error("private Firebase detail")),
    });

    await expect(performAccountDeletion(deps, {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
      ownerUid: "alice",
      password: "",
      provider: "google",
    })).rejects.toEqual(expect.objectContaining({
      accountDeleted: true,
      code: "client_signout_failed",
    }));

    expect(deps.deleteAccount).toHaveBeenCalledOnce();
    expect(deps.clearOwner).toHaveBeenCalledOnce();
  });
});
