import process from "node:process";

import { getDatabase } from "../src/db/client.ts";
import {
  runPersonalRecordProjectionOperator,
} from "../src/server/operations/personal-record-projection.ts";
import { rebuildPersonalRecordProjections } from "../src/server/repositories/workout-repository.ts";

process.exitCode = await runPersonalRecordProjectionOperator(
  process.argv.slice(2),
  {
    database: getDatabase,
    rebuild: rebuildPersonalRecordProjections,
    writeStderr: (value) => process.stderr.write(value),
    writeStdout: (value) => process.stdout.write(value),
  },
);
