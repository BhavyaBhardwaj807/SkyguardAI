import pino from "pino";
import pg from "pg";
import { config, root } from "./config.js";
import { postgres, migrate } from "./db/database.js";
import { loadCatalog } from "./modules/catalog.js";
import { predictionClient } from "./modules/detection.js";
import { schedule } from "./modules/replay.js";
import { recover, processOne } from "./worker.js";
import { application } from "./application.js";
import { Events } from "./events.js";
const log = pino(),
  db = postgres(config.DATABASE_URL),
  events = new Events();
// A dedicated session lock enforces the documented one API/worker deployment.
const lock = new pg.Client({ connectionString: config.DATABASE_URL });
await lock.connect();
if (
  !(await lock.query("SELECT pg_try_advisory_lock(73649201) AS acquired"))
    .rows[0].acquired
)
  throw new Error("Another Skyguard worker already owns this database");
lock.on("error", (err) => {
  log.error({ err }, "Worker lock connection lost");
  process.exit(1);
});
await migrate(db, root);
const catalog = await loadCatalog(root);
for (const s of catalog.stations)
  await db.query(
    "INSERT INTO stations(id,metadata) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata",
    [s.stationId, JSON.stringify(s)],
  );
await recover(db, config.MAX_ATTEMPTS);
const predict = predictionClient(
  config.DETECTION_BASE_URL,
  config.DETECTION_TIMEOUT_MS,
);
const app = application({
  db,
  catalog,
  events,
  origin: config.ALLOWED_ORIGIN,
  mutationToken: config.MUTATION_TOKEN,
  log: (data) => log.info(data),
  detectionHealth: async () => {
    const r = await fetch(`${config.DETECTION_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return r.ok && (await r.json()).model_version !== "uninitialized";
  },
});
const server = app.listen(config.PORT, "0.0.0.0", () =>
  log.info({ port: config.PORT }, "Backend ready"),
);
let stopping = false;
const loop = (async () => {
  while (!stopping) {
    try {
      await schedule(db, catalog);
      await processOne(db, catalog, predict, events, config.MAX_ATTEMPTS);
    } catch (err) {
      log.error({ err }, "Worker iteration failed");
    }
    if (!stopping) await new Promise((r) => setTimeout(r, 250));
  }
})();
async function shutdown() {
  if (stopping) return;
  stopping = true;
  events.close();
  server.close();
  const deadline = setTimeout(() => process.exit(1), 125000);
  deadline.unref();
  await loop;
  await db.close();
  await lock.end();
  clearTimeout(deadline);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
