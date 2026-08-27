import {
  HostedAuthenticatedMediaQaConfigurationError,
  parseHostedAuthenticatedMediaQaConfig,
} from "../src/domain/hosted-authenticated-media-qa";

type NativeZoomAction = "restore_100_percent" | "set_200_percent";

async function waitForNativeZoom(action: NativeZoomAction): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error("Native zoom confirmation requires an interactive terminal.");
  }
  const instruction = action === "set_200_percent"
    ? "Hosted authenticated media QA is ready for native 200-percent zoom. Press Return after setting Chrome to 200 percent.\n"
    : "Hosted authenticated media QA is ready to restore native 100-percent zoom. Press Return after resetting Chrome to 100 percent.\n";
  process.stdout.write(instruction);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      process.stdin.off("data", onData);
      reject(new Error("Native zoom confirmation timed out."));
    }, 120_000);
    const onData = () => {
      clearTimeout(timeout);
      process.stdin.pause();
      resolve();
    };
    process.stdin.once("data", onData);
    process.stdin.resume();
  });
}

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
      `${JSON.stringify(await executeHostedAuthenticatedMediaQa(config, waitForNativeZoom))}\n`,
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
    const detail = error instanceof HostedAuthenticatedMediaQaExecutionError &&
        error.safeDetail
      ? ` (${error.safeDetail})`
      : "";
    process.stderr.write(
      `Hosted authenticated media QA failed safely at the ${stage} stage${detail}; ${cleanup}.\n`,
    );
    return 1;
  }
}

process.exitCode = await main();
