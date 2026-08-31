import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

function harnessLockPath(repositoryRoot) {
  const repositoryKey = createHash("sha256")
    .update(repositoryRoot)
    .digest("hex")
    .slice(0, 16);
  return resolve(tmpdir(), `my-workout-pal-authenticated-${repositoryKey}.lock`);
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

function acquireHarnessLock(repositoryRoot) {
  const lockPath = harnessLockPath(repositoryRoot);
  const openLock = () => {
    const handle = openSync(lockPath, "wx");
    writeFileSync(handle, `${process.pid}\n`);
    return handle;
  };

  let handle;
  try {
    handle = openLock();
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "EEXIST") throw error;
    const existingPid = Number.parseInt(readFileSync(lockPath, "utf8").trim(), 10);
    if (Number.isInteger(existingPid) && existingPid > 0 && processIsAlive(existingPid)) {
      throw new Error("Another authenticated browser harness is already active for this worktree.");
    }
    unlinkSync(lockPath);
    handle = openLock();
  }

  return () => {
    closeSync(handle);
    if (existsSync(lockPath)) unlinkSync(lockPath);
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
  const releaseLock = acquireHarnessLock(repositoryRoot);
  const stagedDestinations = [];

  try {
    requireReadableFile(contourSource, "contours asset");
    for (const asset of fixtureAssets) {
      requireReadableFile(asset.source, "companion asset");
    }

    const stage = (source, destination) => {
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(source, destination, constants.COPYFILE_EXCL);
      stagedDestinations.push(destination);
    };
    stage(contourSource, contourDestination);
    for (const asset of fixtureAssets) stage(asset.source, asset.destination);
  } catch (error) {
    for (const destination of stagedDestinations.reverse()) {
      if (existsSync(destination)) unlinkSync(destination);
    }
    releaseLock();
    throw error;
  }

  return () => {
    try {
      for (const destination of stagedDestinations.reverse()) {
        if (existsSync(destination)) unlinkSync(destination);
      }
    } finally {
      releaseLock();
    }
  };
}
