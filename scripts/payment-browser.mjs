// Keep hosted-checkout bearer URLs out of terminal/tool output during sandbox QA.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const cli = fs
  .readdirSync(".npm-cache/_npx")
  .map((dir) =>
    path.join(
      ".npm-cache/_npx",
      dir,
      "node_modules/@playwright/cli/playwright-cli.js",
    ),
  )
  .find((file) => fs.existsSync(file));
if (!cli) throw new Error("Playwright CLI is not installed.");
const result = spawnSync(
  process.execPath,
  [cli, "-s=hub-admin", ...process.argv.slice(2)],
  { encoding: "utf8", timeout: 120000, maxBuffer: 2 * 1024 * 1024 },
);
const output = ((result.stdout || "") + (result.stderr || "")).replace(
  /https:\/\/sandbox[^\s`"']+/g,
  "[SANDBOX CHECKOUT URL REDACTED]",
);
console.log(
  output
    .split("\n")
    .filter((line) => !line.includes("- option "))
    .join("\n"),
);
process.exitCode = result.error
  ? 1
  : result.status || (/### Error/.test(output) ? 1 : 0);
