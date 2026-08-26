import { describe, expect, it, vi } from "vitest";

import {
  formatAccountDeletionReconciliation,
  parseAccountDeletionReconciliationArgs,
  reconcileAccountDeletionJobs,
  type AccountDeletionReconciliationOperations,
} from "@/server/operations/account-deletion-reconciliation";

const now = new Date("2026-08-25T22:00:00.000Z");

function candidate(ownerUid: string, status: "blocked" | "failed" | "running" = "running") {
  return {
    ownerUid,
    status,
    updatedAt: new Date("2026-08-25T21:00:00.000Z"),
  } as const;
}

function operations(
  candidates = [candidate("alice")],
): AccountDeletionReconciliationOperations {
  return {
    complete: vi.fn().mockResolvedValue({ status: "completed" }),
    listCandidates: vi.fn().mockResolvedValue(candidates),
  };
}

describe("account deletion reconciliation", () => {
  it("parses a strict dry-run default and bounded explicit apply arguments", () => {
    expect(parseAccountDeletionReconciliationArgs([])).toEqual({ apply: false, limit: 20 });
    expect(parseAccountDeletionReconciliationArgs(["--apply", "--limit", "5", "--owner", "alice"])).toEqual({
      apply: true,
      limit: 5,
      ownerUid: "alice",
    });
    expect(parseAccountDeletionReconciliationArgs(["--apply", "--batch", "--limit", "5"])).toEqual({
      apply: true,
      limit: 5,
    });
    expect(() => parseAccountDeletionReconciliationArgs(["--apply"])).toThrow(/owner|batch/iu);
    expect(() => parseAccountDeletionReconciliationArgs(["--batch"])).toThrow(/only with/iu);
    expect(() => parseAccountDeletionReconciliationArgs(["--limit", "0"])).toThrow(/limit/iu);
    expect(() => parseAccountDeletionReconciliationArgs(["--owner", " "])).toThrow(/owner/iu);
    expect(() => parseAccountDeletionReconciliationArgs(["--owner", " alice "])).toThrow(/owner/iu);
    expect(() => parseAccountDeletionReconciliationArgs(["--delete"])).toThrow(/argument/iu);
  });

  it("dry-runs an absent Firebase identity without writing the job", async () => {
    const repository = operations();
    const getUser = vi.fn().mockRejectedValue({ code: "auth/user-not-found", message: "private" });

    const report = await reconcileAccountDeletionJobs({
      getFirebaseAuth: () => ({ getUser }),
      getRepository: () => repository,
    }, { apply: false, limit: 20 }, now);

    expect(getUser).toHaveBeenCalledWith("alice");
    expect(repository.complete).not.toHaveBeenCalled();
    expect(report.outcomes).toEqual([
      expect.objectContaining({ priorStatus: "running", result: "would_complete" }),
    ]);
    expect(JSON.stringify(report)).not.toContain("alice");
  });

  it("applies completion only after Firebase reports the exact UID absent", async () => {
    const repository = operations();
    const report = await reconcileAccountDeletionJobs({
      getFirebaseAuth: () => ({
        getUser: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
      }),
      getRepository: () => repository,
    }, { apply: true, limit: 1 }, now);

    expect(repository.complete).toHaveBeenCalledWith(candidate("alice"), now);
    expect(report.outcomes[0]).toMatchObject({ result: "completed" });
  });

  it("never deletes or completes an identity that still exists", async () => {
    const repository = operations();
    const getUser = vi.fn().mockResolvedValue({ uid: "alice" });

    const report = await reconcileAccountDeletionJobs({
      getFirebaseAuth: () => ({ getUser }),
      getRepository: () => repository,
    }, { apply: true, limit: 20 }, now);

    expect(repository.complete).not.toHaveBeenCalled();
    expect(report.outcomes[0]).toMatchObject({ result: "identity_exists" });
    expect("deleteUser" in { getUser }).toBe(false);
  });

  it("preserves jobs on provider uncertainty and omits raw errors and UIDs", async () => {
    const repository = operations([candidate("sensitive-owner", "failed")]);
    const report = await reconcileAccountDeletionJobs({
      getFirebaseAuth: () => ({
        getUser: vi.fn().mockRejectedValue(new Error("socket leaked private provider detail")),
      }),
      getRepository: () => repository,
    }, { apply: true, limit: 20 }, now);

    expect(repository.complete).not.toHaveBeenCalled();
    expect(report.outcomes[0]).toMatchObject({
      errorCode: "firebase_unavailable",
      result: "provider_uncertain",
    });
    expect(formatAccountDeletionReconciliation(report)).not.toMatch(
      /sensitive-owner|socket leaked|private provider/iu,
    );
  });

  it("isolates a completion write failure and continues the bounded batch", async () => {
    const candidates = [candidate("alice"), candidate("bob", "blocked")];
    const repository = operations(candidates);
    vi.mocked(repository.complete)
      .mockRejectedValueOnce(new Error("private database detail"))
      .mockResolvedValueOnce({ status: "completed" });

    const report = await reconcileAccountDeletionJobs({
      getFirebaseAuth: () => ({
        getUser: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
      }),
      getRepository: () => repository,
    }, { apply: true, limit: 2 }, now);

    expect(repository.complete).toHaveBeenCalledTimes(2);
    expect(report.outcomes.map(({ result }) => result)).toEqual(["write_failed", "completed"]);
    expect(formatAccountDeletionReconciliation(report)).not.toContain("private database detail");
  });
});
