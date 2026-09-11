import { readdir, readFile } from "node:fs/promises";
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await check(path);
    else if (
      /\.[jt]sx?$/.test(path) &&
      /(?:from\s*|import\s*\()['"][^'"]*backend/.test(
        await readFile(path, "utf8"),
      )
    )
      throw new Error(`Frontend imports backend: ${path}`);
  }
}
await check("src/app/frontend");
console.log("Frontend/backend import boundary passed");
