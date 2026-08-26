import process from "node:process";

import { startYouTubeEmbedProbeServer } from "../src/domain/youtube/embed-probe.ts";

function optionValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function requiredOption(args: readonly string[], name: string): string {
  const value = optionValue(args, name)?.trim();
  if (!value) throw new Error(`youtube:probe-embed requires ${name}.`);
  return value;
}

function port(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error("youtube:probe-embed --port must be an integer from 0 through 65535.");
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const probe = await startYouTubeEmbedProbeServer({
    videoReference: requiredOption(args, "--video"),
    port: port(optionValue(args, "--port")),
  });
  console.log(`Private loopback YouTube embed probe: ${probe.url}`);
  console.log("Open that HTTP URL in a browser; direct embed navigation is invalid evidence because it omits the referrer.");
  console.log("Press Ctrl+C after playback, keyboard-control, and direct-fallback checks are complete.");
  await new Promise<void>((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await probe.close();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "youtube:probe-embed failed safely.");
  process.exitCode = 1;
});
