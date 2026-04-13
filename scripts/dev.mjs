import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const lockPath = path.join(repoRoot, ".next", "dev", "lock");
const appPagePath = path.join(repoRoot, "src", "app", "page.tsx");

const restart = process.argv.includes("--restart");
const existing = readLockFile(lockPath);

if (existing && isProcessAlive(existing.pid)) {
  const healthy = restart ? false : await isHealthyDevServer(existing);

  if (healthy) {
    printExistingServer(existing);
    process.exit(0);
  }

  process.kill(existing.pid, "SIGTERM");
  waitForExit(existing.pid);
  cleanDevState();
} else if (existing || restart) {
  cleanDevState();
}

const child = spawn("pnpm", ["exec", "next", "dev"], {
  cwd: repoRoot,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function readLockFile(filePath) {
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function waitForExit(pid) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5_000) {
    if (!isProcessAlive(pid)) {
      return;
    }
  }

  process.kill(pid, "SIGKILL");
}

function printExistingServer(lock) {
  const appUrl = typeof lock.appUrl === "string" ? lock.appUrl : `http://localhost:${lock.port}`;
  console.log(`A dev server for this workspace is already running at ${appUrl} (PID ${lock.pid}).`);
  console.log("Use `pnpm dev:restart` if you want to stop it and start a fresh server.");
}

async function isHealthyDevServer(lock) {
  const appUrl = typeof lock.appUrl === "string" ? lock.appUrl : `http://localhost:${lock.port}`;

  try {
    const response = await fetch(appUrl, {
      redirect: "manual",
    });

    if (existsSync(appPagePath) && response.status === 404) {
      return false;
    }

    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function cleanDevState() {
  rmSync(path.join(repoRoot, ".next", "dev"), {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 100,
  });
}
