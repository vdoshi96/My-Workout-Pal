import {
  HostedAuthQaConfigurationError,
  parseHostedAuthQaConfig,
} from "../src/domain/hosted-auth-qa";

async function main(): Promise<number> {
  let config: ReturnType<typeof parseHostedAuthQaConfig>;
  try {
    config = parseHostedAuthQaConfig(process.env);
  } catch (error) {
    const code = error instanceof HostedAuthQaConfigurationError
      ? error.code
      : "configuration_invalid";
    process.stderr.write(`Hosted authentication QA stopped safely (${code}).\n`);
    return 1;
  }

  try {
    const { executeHostedAuthQa } = await import("./lib/hosted-auth-browser");
    const result = await executeHostedAuthQa(config);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    const { HostedAuthQaExecutionError } = await import("./lib/hosted-auth-browser");
    const cleanup = error instanceof HostedAuthQaExecutionError && error.cleanupConfirmed
      ? "Disposable Firebase identity cleanup was confirmed."
      : "One disposable Firebase identity may require manual cleanup.";
    process.stderr.write(`Hosted authentication QA failed safely. ${cleanup}\n`);
    return 1;
  }
}

process.exitCode = await main();
