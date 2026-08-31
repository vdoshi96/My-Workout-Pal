import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

function harnessLockPath(repositoryRoot) {
  const repositoryKey = createHash("sha256")
    .update(repositoryRoot)
    .digest("hex")
    .slice(0, 16);
  return resolve(tmpdir(), `my-workout-pal-authenticated-${repositoryKey}.lock`);
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ESRCH") return false;
    return true;
  }
}

function lockMetadata(path) {
  const raw = readFileSync(path, "utf8").trim();
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    const pid = Number.parseInt(raw, 10);
    return Number.isInteger(pid) ? { pid } : {};
  }
}

function removeOwnedStage(entry, expectedHash) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.destination !== "string" ||
    typeof entry.stagingPath !== "string" ||
    entry.hash !== expectedHash ||
    dirname(entry.stagingPath) !== dirname(entry.destination) ||
    !basename(entry.stagingPath).startsWith(".mwp-authenticated-stage-") ||
    !existsSync(entry.stagingPath) ||
    fileHash(entry.stagingPath) !== expectedHash
  ) {
    return;
  }

  if (existsSync(entry.destination)) {
    const stagingStat = statSync(entry.stagingPath);
    const destinationStat = statSync(entry.destination);
    if (stagingStat.dev === destinationStat.dev && stagingStat.ino === destinationStat.ino) {
      unlinkSync(entry.destination);
    }
  }
  unlinkSync(entry.stagingPath);
}

function recoverStaleDestinations(metadata, plannedDestinations) {
  if (metadata.schemaVersion !== 1 || !Array.isArray(metadata.staged)) return;
  const plannedByDestination = new Map(
    plannedDestinations.map((entry) => [entry.destination, entry.hash]),
  );
  for (const entry of metadata.staged) {
    removeOwnedStage(entry, plannedByDestination.get(entry?.destination));
  }
}

function acquireHarnessLock(repositoryRoot, plannedDestinations) {
  const lockPath = harnessLockPath(repositoryRoot);
  let staged = [];
  const openLock = () => {
    const handle = openSync(lockPath, "wx");
    writeFileSync(handle, `${JSON.stringify({ schemaVersion: 1, pid: process.pid, staged })}\n`);
    return handle;
  };

  let handle;
  try {
    handle = openLock();
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "EEXIST") throw error;
    const metadata = lockMetadata(lockPath);
    const existingPid = metadata.pid;
    if (Number.isInteger(existingPid) && existingPid > 0 && processIsAlive(existingPid)) {
      throw new Error("Another authenticated browser harness is already active for this worktree.");
    }
    recoverStaleDestinations(metadata, plannedDestinations);
    unlinkSync(lockPath);
    staged = [];
    handle = openLock();
  }

  return {
    recordStaged(entry) {
      staged.push(entry);
      writeFileSync(
        lockPath,
        `${JSON.stringify({ schemaVersion: 1, pid: process.pid, staged })}\n`,
      );
    },
    release() {
      closeSync(handle);
      if (existsSync(lockPath)) unlinkSync(lockPath);
    },
  };
}

function requireReadableFile(path, label) {
  if (!statSync(path).isFile() || statSync(path).size === 0) {
    throw new Error(`The authenticated fixture requires the maintained ${label}.`);
  }
}

export function stageAuthenticatedFixture({
  contourDestination,
  contourSource,
  fixtureAssets,
  repositoryRoot,
}) {
  requireReadableFile(contourSource, "contours asset");
  for (const asset of fixtureAssets) {
    requireReadableFile(asset.source, "companion asset");
  }
  const plannedAssets = [
    { destination: contourDestination, source: contourSource },
    ...fixtureAssets,
  ];
  const plannedDestinations = plannedAssets.map(({ destination, source }) => ({
    destination,
    hash: fileHash(source),
  }));
  const lock = acquireHarnessLock(repositoryRoot, plannedDestinations);
  const stagedEntries = [];

  try {
    const stage = (source, destination, hash) => {
      mkdirSync(dirname(destination), { recursive: true });
      const entry = {
        destination,
        hash,
        stagingPath: resolve(
          dirname(destination),
          `.mwp-authenticated-stage-${randomUUID()}`,
        ),
      };
      lock.recordStaged(entry);
      stagedEntries.push(entry);
      copyFileSync(source, entry.stagingPath, constants.COPYFILE_EXCL);
      linkSync(entry.stagingPath, destination);
    };
    for (const [index, asset] of plannedAssets.entries()) {
      stage(asset.source, asset.destination, plannedDestinations[index].hash);
    }
  } catch (error) {
    for (const entry of stagedEntries.reverse()) {
      removeOwnedStage(entry, entry.hash);
    }
    lock.release();
    throw error;
  }

  return () => {
    try {
      for (const entry of stagedEntries.reverse()) {
        removeOwnedStage(entry, entry.hash);
      }
    } finally {
      lock.release();
    }
  };
}
