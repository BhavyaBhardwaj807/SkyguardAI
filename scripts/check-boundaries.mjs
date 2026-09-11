import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
async function check(dir) {
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await check(path);
    else if (
      /\.[jt]sx?$/.test(path) &&
      /(?:from\s*|import\s*\()['"'][^'"]*backend/.test(
        await readFile(path, "utf8"),
      )
    )
      throw new Error(`Frontend imports backend: ${path}`);
  }
}
// Check frontend dirs but skip the backend sub-dir
for (const dir of [
  "src/app/frontend",
  "src/app/demo",
]) {
  await check(dir);
}
console.log("Frontend/backend import boundary passed");
