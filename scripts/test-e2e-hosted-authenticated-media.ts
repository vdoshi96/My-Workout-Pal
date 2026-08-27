import {
  HostedAuthenticatedMediaQaConfigurationError,
  parseHostedAuthenticatedMediaQaConfig,
} from "../src/domain/hosted-authenticated-media-qa";

async function main(): Promise<number> {
  let config: ReturnType<typeof parseHostedAuthenticatedMediaQaConfig>;
  try {
    config = parseHostedAuthenticatedMediaQaConfig(process.env);
  } catch (error) {
    const code = error instanceof HostedAuthenticatedMediaQaConfigurationError
      ? error.code
      : "configuration_invalid";
    process.stderr.write(
      `Hosted authenticated media QA stopped safely (${code}).\n`,
    );
    return 1;
  }

  try {
    const { executeHostedAuthenticatedMediaQa } = await import(
      "./lib/hosted-authenticated-media-browser"
    );
    process.stdout.write(
      `${JSON.stringify(await executeHostedAuthenticatedMediaQa(config))}\n`,
    );
    return 0;
  } catch (error) {
    const { HostedAuthenticatedMediaQaExecutionError } = await import(
      "./lib/hosted-authenticated-media-browser"
    );
    const cleanup = error instanceof HostedAuthenticatedMediaQaExecutionError &&
        error.cleanupConfirmed
      ? "cleanup was confirmed"
      : "manual cleanup may be required";
    const stage = error instanceof HostedAuthenticatedMediaQaExecutionError
      ? error.stage
      : "unclassified";
    process.stderr.write(
      `Hosted authenticated media QA failed safely at the ${stage} stage; ${cleanup}.\n`,
    );
    return 1;
  }
}

process.exitCode = await main();
