import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

function runStep(label, command, args, cwd = root) {
  // Node (post CVE-2024-27980) refuses to spawn .cmd files directly on
  // Windows, so route npm.cmd through cmd.exe like dev-all.mjs does.
  if (isWindows && command.endsWith(".cmd")) {
    args = ["/d", "/c", command, ...args];
    command = "cmd.exe";
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
      windowsHide: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}

async function ensureDependencies(label, nodeModulesPath, installArgs) {
  if (existsSync(nodeModulesPath)) {
    console.log(`${label} dependencies already installed.`);
    return;
  }

  console.log(`Installing ${label} dependencies...`);
  await runStep(`Installing ${label} dependencies`, npmCommand, installArgs);
}

await ensureDependencies("backend", path.join(root, "node_modules"), ["install"]);
await ensureDependencies("mobile", path.join(root, "mobile", "node_modules"), ["--prefix", "mobile", "install"]);

process.chdir(root);

console.log("Starting BoveCloset backend and Expo mobile app...");
console.log("Press Ctrl+C to stop both processes.");

await import("./dev-all.mjs");
