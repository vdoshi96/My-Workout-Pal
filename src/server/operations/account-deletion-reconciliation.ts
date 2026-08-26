import { createHash } from "node:crypto";

import type { Auth } from "firebase-admin/auth";

import { classifyFirebaseDeletionError, type FirebaseDeletionFailure } from "@/domain/account-deletion";

const DEFAULT_LIMIT = 20;
const MAXIMUM_LIMIT = 100;
const MAXIMUM_FIREBASE_UID_LENGTH = 128;

export type AccountDeletionReconciliationOptions = Readonly<{
  apply: boolean;
  limit: number;
  ownerUid?: string;
}>;

export type AccountDeletionReconciliationCandidate = Readonly<{
  ownerUid: string;
  status: "blocked" | "failed" | "running";
  updatedAt: Date;
}>;

export type AccountDeletionReconciliationOperations = Readonly<{
  complete: (
    candidate: AccountDeletionReconciliationCandidate,
    now: Date,
  ) => Promise<Readonly<{ status: string }>>;
  listCandidates: (
    selection: Readonly<{ limit: number; ownerUid?: string }>,
  ) => Promise<readonly AccountDeletionReconciliationCandidate[]>;
}>;

type ReconciliationFirebaseAuth = Pick<Auth, "getUser">;

export type AccountDeletionReconciliationDependencies = Readonly<{
  getFirebaseAuth: () => ReconciliationFirebaseAuth;
  getRepository: () => AccountDeletionReconciliationOperations;
}>;

export type AccountDeletionReconciliationOutcome = Readonly<{
  errorCode?: FirebaseDeletionFailure["code"] | "completion_write";
  ownerFingerprint: string;
  priorStatus: AccountDeletionReconciliationCandidate["status"];
  result:
    | "completed"
    | "identity_exists"
    | "provider_uncertain"
    | "would_complete"
    | "write_failed";
}>;

export type AccountDeletionReconciliationReport = Readonly<{
  apply: boolean;
  candidateCount: number;
  outcomes: readonly AccountDeletionReconciliationOutcome[];
}>;

function requireValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new RangeError(`${flag} requires a value.`);
  }
  return value;
}

function parseLimit(value: string): number {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAXIMUM_LIMIT) {
    throw new RangeError(`The reconciliation limit must be between 1 and ${MAXIMUM_LIMIT}.`);
  }
  return limit;
}

function parseOwnerUid(value: string): string {
  const ownerUid = value.trim();
  if (
    ownerUid !== value ||
    ownerUid.length < 1 ||
    ownerUid.length > MAXIMUM_FIREBASE_UID_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(ownerUid)
  ) {
    throw new RangeError("The reconciliation owner UID is invalid.");
  }
  return ownerUid;
}

export function parseAccountDeletionReconciliationArgs(
  args: readonly string[],
): AccountDeletionReconciliationOptions {
  let apply = false;
  let batch = false;
  let limit = DEFAULT_LIMIT;
  let ownerUid: string | undefined;
  const seen = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument || !["--apply", "--batch", "--limit", "--owner"].includes(argument)) {
      throw new RangeError("Unknown reconciliation argument.");
    }
    if (seen.has(argument)) throw new RangeError(`Duplicate reconciliation argument: ${argument}`);
    seen.add(argument);
    if (argument === "--apply") {
      apply = true;
      continue;
    }
    if (argument === "--batch") {
      batch = true;
      continue;
    }
    const value = requireValue(args, index, argument);
    index += 1;
    if (argument === "--limit") limit = parseLimit(value);
    else ownerUid = parseOwnerUid(value);
  }

  if (batch && !apply) {
    throw new RangeError("--batch is valid only with --apply.");
  }
  if (batch && ownerUid !== undefined) {
    throw new RangeError("Choose either --owner or --batch for apply.");
  }
  if (apply && ownerUid === undefined && !batch) {
    throw new RangeError("Apply requires an explicit --owner or --batch selection.");
  }

  return ownerUid === undefined ? { apply, limit } : { apply, limit, ownerUid };
}

function ownerFingerprint(ownerUid: string): string {
  return createHash("sha256")
    .update(`my-workout-pal:account-deletion:${ownerUid}`)
    .digest("hex")
    .slice(0, 12);
}

export async function reconcileAccountDeletionJobs(
  dependencies: AccountDeletionReconciliationDependencies,
  options: AccountDeletionReconciliationOptions,
  now = new Date(),
): Promise<AccountDeletionReconciliationReport> {
  const firebaseAuth = dependencies.getFirebaseAuth();
  const repository = dependencies.getRepository();
  const candidates = await repository.listCandidates({
    limit: options.limit,
    ...(options.ownerUid === undefined ? {} : { ownerUid: options.ownerUid }),
  });
  const outcomes: AccountDeletionReconciliationOutcome[] = [];

  for (const candidate of candidates) {
    const shared = {
      ownerFingerprint: ownerFingerprint(candidate.ownerUid),
      priorStatus: candidate.status,
    } as const;
    try {
      await firebaseAuth.getUser(candidate.ownerUid);
      outcomes.push({ ...shared, result: "identity_exists" });
      continue;
    } catch (error) {
      const failure = classifyFirebaseDeletionError(error);
      if (!failure.alreadyDeleted) {
        outcomes.push({
          ...shared,
          errorCode: failure.code,
          result: "provider_uncertain",
        });
        continue;
      }
    }

    if (!options.apply) {
      outcomes.push({ ...shared, result: "would_complete" });
      continue;
    }
    try {
      await repository.complete(candidate, now);
      outcomes.push({ ...shared, result: "completed" });
    } catch {
      outcomes.push({
        ...shared,
        errorCode: "completion_write",
        result: "write_failed",
      });
    }
  }

  return { apply: options.apply, candidateCount: candidates.length, outcomes };
}

export function formatAccountDeletionReconciliation(
  report: AccountDeletionReconciliationReport,
): string {
  const lines = [
    `mode=${report.apply ? "apply" : "dry-run"} candidates=${report.candidateCount}`,
    ...report.outcomes.map((outcome) => [
      `owner=${outcome.ownerFingerprint}`,
      `prior=${outcome.priorStatus}`,
      `result=${outcome.result}`,
      ...(outcome.errorCode === undefined ? [] : [`error=${outcome.errorCode}`]),
    ].join(" ")),
  ];
  const failures = report.outcomes.filter(
    ({ result }) => result === "provider_uncertain" || result === "write_failed",
  ).length;
  lines.push(`summary completed=${report.outcomes.filter(({ result }) => result === "completed").length} failures=${failures}`);
  return lines.join("\n");
}
