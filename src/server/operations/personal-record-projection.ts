export type PersonalRecordProjectionOperatorOptions = Readonly<{
  apply: boolean;
  batchSize?: number;
  help: boolean;
}>;

export const PERSONAL_RECORD_PROJECTION_OPERATOR_USAGE =
  "Usage: pnpm db:rebuild-personal-records -- [--apply] [--batch-size N]";
export const PERSONAL_RECORD_PROJECTION_SAFE_FAILURE =
  "Personal-record projection rebuild failed safely.";

export type PersonalRecordProjectionOperatorDependencies = Readonly<{
  database: () => Database;
  rebuild: (
    database: Database,
    input: PersonalRecordProjectionRebuildInput,
  ) => Promise<PersonalRecordProjectionRebuildResult>;
  writeStderr: (value: string) => void;
  writeStdout: (value: string) => void;
}>;

function parsePositiveInteger(value: string, fieldName: string): number {
  if (!/^[1-9][0-9]*$/u.test(value)) {
    throw new RangeError(`${fieldName} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`${fieldName} must be a safe positive integer.`);
  }
  return parsed;
}

function optionValue(
  args: readonly string[],
  index: number,
  option: string,
): Readonly<{ value: string; nextIndex: number }> {
  const argument = args[index];
  if (argument?.startsWith(`${option}=`)) {
    return { nextIndex: index, value: argument.slice(option.length + 1) };
  }
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new RangeError(`${option} requires a value.`);
  }
  return { nextIndex: index + 1, value };
}

export function parsePersonalRecordProjectionArgs(
  args: readonly string[],
): PersonalRecordProjectionOperatorOptions {
  let apply = false;
  let mode: "apply" | "dry_run" | undefined;
  let batchSize: number | undefined;
  let help = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--" && index === 0) continue;
    if (argument === "--apply") {
      if (mode !== undefined) {
        throw new RangeError("--apply and --dry-run may be specified only once.");
      }
      apply = true;
      mode = "apply";
      continue;
    }
    if (argument === "--dry-run") {
      if (mode !== undefined) {
        throw new RangeError("--apply and --dry-run may be specified only once.");
      }
      apply = false;
      mode = "dry_run";
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--batch-size" || argument?.startsWith("--batch-size=")) {
      if (batchSize !== undefined) {
        throw new RangeError("--batch-size may be specified only once.");
      }
      const parsed = optionValue(args, index, "--batch-size");
      batchSize = parsePositiveInteger(parsed.value, "--batch-size");
      index = parsed.nextIndex;
      continue;
    }
    throw new RangeError(`Unknown personal-record projection option: ${argument ?? ""}`);
  }
  return {
    apply,
    ...(batchSize === undefined ? {} : { batchSize }),
    help,
  };
}

export async function runPersonalRecordProjectionOperator(
  args: readonly string[],
  dependencies: PersonalRecordProjectionOperatorDependencies,
): Promise<0 | 1> {
  let options: PersonalRecordProjectionOperatorOptions;
  try {
    options = parsePersonalRecordProjectionArgs(args);
  } catch (error) {
    dependencies.writeStderr(
      `${error instanceof Error ? error.message : "Invalid personal-record projection arguments."}\n`,
    );
    return 1;
  }

  if (options.help) {
    dependencies.writeStdout(`${PERSONAL_RECORD_PROJECTION_OPERATOR_USAGE}\n`);
    return 0;
  }

  try {
    const result = await dependencies.rebuild(dependencies.database(), {
      apply: options.apply,
      ...(options.batchSize === undefined ? {} : { batchSize: options.batchSize }),
    });
    dependencies.writeStdout(`${JSON.stringify(result)}\n`);
    return 0;
  } catch {
    dependencies.writeStderr(`${PERSONAL_RECORD_PROJECTION_SAFE_FAILURE}\n`);
    return 1;
  }
}
import type { Database } from "@/db/client";
import type {
  PersonalRecordProjectionRebuildInput,
  PersonalRecordProjectionRebuildResult,
} from "@/server/repositories/workout-repository";
