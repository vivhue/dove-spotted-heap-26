import { spawn } from "node:child_process";
import net from "node:net";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const backendPort = Number(process.env.PORT || 5173);

const processes = [
  {
    name: "backend",
    color: "\x1b[36m",
    command: process.execPath,
    args: ["--env-file=.env", "--experimental-strip-types", "server.ts"],
    cwd: process.cwd(),
  },
  {
    name: "mobile",
    color: "\x1b[35m",
    command: npmCommand,
    args: ["--prefix", "mobile", "run", "start"],
    cwd: process.cwd(),
    inheritStdio: true,
  },
];

const reset = "\x1b[0m";
const children = [];
let shuttingDown = false;

function prefixOutput(childConfig, stream, data) {
  const lines = data.toString().split(/\r?\n/);

  for (const line of lines) {
    if (!line) {
      continue;
    }

    stream.write(`${childConfig.color}[${childConfig.name}]${reset} ${line}\n`);
  }
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.stdout.write(`\nStopping dev servers...\n`);

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

await ensurePortAvailable(backendPort);

for (const config of processes) {
  const child = spawn(config.command, config.args, {
    cwd: config.cwd,
    env: process.env,
    shell: process.platform === "win32",
    stdio: config.inheritStdio ? "inherit" : ["inherit", "pipe", "pipe"],
    windowsHide: false,
  });

  children.push(child);
  prefixOutput(config, process.stdout, `started: ${config.command} ${config.args.join(" ")}`);

  if (child.stdout) {
    child.stdout.on("data", (data) => prefixOutput(config, process.stdout, data));
  }

  if (child.stderr) {
    child.stderr.on("data", (data) => prefixOutput(config, process.stderr, data));
  }

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stderr.write(`${config.color}[${config.name}]${reset} exited with ${reason}\n`);
    shutdown("SIGTERM");
    process.exitCode = code || 1;
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function ensurePortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        process.stderr.write(
          [
            `Port ${port} is already in use, so the backend cannot start cleanly.`,
            "Stop the old dev server first with Ctrl+C in its terminal, then run npm run dev again.",
            `If you cannot find it, run: lsof -nP -iTCP:${port} -sTCP:LISTEN`,
          ].join("\n") + "\n"
        );
        process.exit(1);
      }

      process.stderr.write(`Could not check port ${port}: ${error.message}\n`);
      process.exit(1);
    });

    probe.once("listening", () => {
      probe.close(resolve);
    });

    probe.listen(port);
  });
}
