import { spawn } from "node:child_process";

const args = process.argv.slice(2);
let port = process.env.PORT || "3000";
let host = "0.0.0.0";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = args[i + 1];
    i++;
  } else if ((args[i] === "--host" || args[i] === "-H" || args[i] === "--hostname") && args[i + 1]) {
    host = args[i + 1];
    i++;
  }
}

console.log(`[AlephVisio Studio] Starting Next.js dev server on http://${host}:${port} ...`);

const nextBin = "./node_modules/next/dist/bin/next";
const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "-p", port, "-H", host], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
