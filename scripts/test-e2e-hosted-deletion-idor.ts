import {
  HostedDeletionQaConfigurationError,
  parseHostedDeletionQaConfig,
} from "../src/domain/hosted-deletion-qa";

async function main(): Promise<number> {
  let config: ReturnType<typeof parseHostedDeletionQaConfig>;
  try {
    config = parseHostedDeletionQaConfig(process.env);
  } catch (error) {
    const code = error instanceof HostedDeletionQaConfigurationError
      ? error.code
      : "configuration_invalid";
    process.stderr.write(`Hosted deletion QA stopped safely (${code}).\n`);
    return 1;
  }

  try {
    const { executeHostedDeletionQa } = await import("./lib/hosted-deletion-browser");
    process.stdout.write(`${JSON.stringify(await executeHostedDeletionQa(config))}\n`);
    return 0;
  } catch (error) {
    const { HostedDeletionQaExecutionError } = await import(
      "./lib/hosted-deletion-browser"
    );
    const cleanup = error instanceof HostedDeletionQaExecutionError &&
      error.cleanupConfirmed
      ? "cleanup was confirmed"
      : "manual cleanup may be required";
    const stage = error instanceof HostedDeletionQaExecutionError
      ? error.stage
      : "unclassified";
    process.stderr.write(
      `Hosted deletion QA failed safely at the ${stage} stage; ${cleanup}.\n`,
    );
    return 1;
  }
}

process.exitCode = await main();
