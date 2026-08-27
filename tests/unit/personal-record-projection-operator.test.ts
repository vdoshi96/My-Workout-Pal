import { describe, expect, it } from "vitest";

import {
  parsePersonalRecordProjectionArgs,
  runPersonalRecordProjectionOperator,
} from "@/server/operations/personal-record-projection";
import type { Database } from "@/db/client";

describe("personal-record projection operator arguments", () => {
  it("defaults to a dry run and accepts bounded batch options", () => {
    expect(parsePersonalRecordProjectionArgs([
      "--batch-size=25",
    ])).toEqual({
      apply: false,
      batchSize: 25,
      help: false,
    });
  });

  it("requires an explicit apply flag for writes", () => {
    expect(parsePersonalRecordProjectionArgs(["--apply", "--batch-size", "10"]))
      .toMatchObject({ apply: true, batchSize: 10, help: false });
    expect(parsePersonalRecordProjectionArgs(["--", "--apply"]))
      .toMatchObject({ apply: true, help: false });
    expect(() => parsePersonalRecordProjectionArgs(["--dry-run", "--apply"]))
      .toThrow(/only once/iu);
    expect(() => parsePersonalRecordProjectionArgs(["--apply", "--apply"]))
      .toThrow(/only once/iu);
    expect(() => parsePersonalRecordProjectionArgs(["--dry-run", "--dry-run"]))
      .toThrow(/only once/iu);
  });

  it("rejects unknown and malformed command options", () => {
    expect(() => parsePersonalRecordProjectionArgs(["--owner", "alice"])).toThrow(/Unknown/iu);
    expect(() => parsePersonalRecordProjectionArgs(["--interrupt-after-batches", "1"])).toThrow(/Unknown/iu);
    expect(() => parsePersonalRecordProjectionArgs(["--batch-size", "0"])).toThrow(/positive integer/iu);
    expect(() => parsePersonalRecordProjectionArgs(["--batch-size"])).toThrow(/requires a value/iu);
    expect(() => parsePersonalRecordProjectionArgs(["--apply", "--"])).toThrow(/Unknown/iu);
    expect(() => parsePersonalRecordProjectionArgs([
      "--batch-size=10",
      "--batch-size",
      "20",
    ])).toThrow(/only once/iu);
  });

  it("sanitizes provider and database failures after validated arguments", async () => {
    let stderr = "";
    let stdout = "";
    const code = await runPersonalRecordProjectionOperator(["--apply"], {
      database: () => ({}) as Database,
      rebuild: async () => {
        throw new Error(
          "duplicate key for firebase_uid=qa-auth-harness-alice SQL INSERT INTO personal_records",
        );
      },
      writeStderr: (value) => {
        stderr += value;
      },
      writeStdout: (value) => {
        stdout += value;
      },
    });

    expect(code).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toBe("Personal-record projection rebuild failed safely.\n");
    expect(stderr).not.toContain("qa-auth-harness-alice");
    expect(stderr).not.toContain("INSERT INTO");
  });
});
