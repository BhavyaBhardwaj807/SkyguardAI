import { z } from "zod";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import dotenv from "dotenv";
export function repositoryRoot() {
  let p = process.cwd();
  while (!existsSync(resolve(p, "ml-service"))) {
    const parent = dirname(p);
    if (parent === p)
      throw new Error("Run inside the SkyguardAI repository or set REPO_ROOT");
    p = parent;
  }
  return p;
}
export const root = process.env.REPO_ROOT || repositoryRoot();
dotenv.config({ path: resolve(root, ".env"), quiet: true });
export const config = z
  .object({
    DATABASE_URL: z
      .string()
      .default("postgres://skyguard:skyguard_local@127.0.0.1:5432/skyguard"),
    PORT: z.coerce.number().int().default(4000),
    DETECTION_BASE_URL: z.url().default("http://127.0.0.1:8000"),
    DETECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(60000)
      .default(5000),
    MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
    ALLOWED_ORIGIN: z.url().default("http://localhost:3000"),
    MUTATION_TOKEN: z.string().default(""),
    DEMO_MODE: z.enum(["true", "false"]).default("true"),
  })
  .parse(process.env);
if (config.DEMO_MODE === "false" && !config.MUTATION_TOKEN)
  throw new Error("MUTATION_TOKEN required outside local demo mode");
