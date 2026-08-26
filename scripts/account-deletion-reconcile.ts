import { getDatabase } from "../src/db/client";
import { FirebaseConfigurationError, getFirebaseAdminAuth } from "../src/server/firebase/admin";
import {
  formatAccountDeletionReconciliation,
  parseAccountDeletionReconciliationArgs,
  reconcileAccountDeletionJobs,
} from "../src/server/operations/account-deletion-reconciliation";
import {
  completeAccountDeletionReconciliation,
  listAccountDeletionReconciliationCandidates,
} from "../src/server/repositories/account-deletion";

function safeOperatorError(error: unknown): string {
  if (error instanceof RangeError) return error.message;
  if (error instanceof FirebaseConfigurationError) {
    return "Firebase Admin is not configured for account-deletion reconciliation.";
  }
  return "Account-deletion reconciliation could not be completed. Review sanitized server logs and configuration.";
}

async function main(): Promise<void> {
  try {
    const options = parseAccountDeletionReconciliationArgs(process.argv.slice(2));
    const database = getDatabase();
    const report = await reconcileAccountDeletionJobs(
      {
        getFirebaseAuth: getFirebaseAdminAuth,
        getRepository: () => ({
          complete: (candidate, now) => completeAccountDeletionReconciliation(
            database,
            candidate,
            now,
          ),
          listCandidates: (selection) => listAccountDeletionReconciliationCandidates(
            database,
            selection,
          ),
        }),
      },
      options,
    );
    process.stdout.write(`${formatAccountDeletionReconciliation(report)}\n`);
    if (report.outcomes.some(
      ({ result }) => result === "provider_uncertain" || result === "write_failed",
    )) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${safeOperatorError(error)}\n`);
    process.exitCode = 1;
  }
}

await main();
