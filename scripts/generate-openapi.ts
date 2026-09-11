import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { batchSchema, featuresSchema } from "../src/contracts/index.js";
const str = { type: "string" },
  obj = { type: "object" },
  runQuery = { name: "runId", in: "query", required: true, schema: str };
const paths: Record<string, any> = {};
const add = (
  path: string,
  method: string,
  summary: string,
  options: any = {},
) => {
  const parameters = [
    ...(path.match(/\{\w+\}/g) || []).map((p) => ({
      name: p.slice(1, -1),
      in: "path",
      required: true,
      schema: str,
    })),
    ...(options.run ? [runQuery] : []),
    ...(options.parameters || []),
  ];
  paths[path] ??= {};
  paths[path][method] = {
    summary,
    parameters,
    ...(options.body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: options.body } },
          },
        }
      : {}),
    responses: {
      [options.status || 200]: {
        description: "Success",
        content: { "application/json": { schema: options.response || obj } },
      },
      ...Object.fromEntries(
        [400, 404, 409, 413, 422, 500].map((code) => [
          code,
          {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        ]),
      ),
    },
  };
};
const body = (properties: any, required: string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
add("/healthz", "get", "Process liveness");
add("/readyz", "get", "Readiness; 200 degraded if only detection unavailable");
add(
  "/api/v1/replay/scenarios",
  "get",
  "Scenario windows, provenance and limitations",
);
add("/api/v1/replay/runs", "get", "Latest 50 runs");
add("/api/v1/replay/runs", "post", "Create isolated paused run", {
  status: 201,
  body: body({ scenarioId: str }, ["scenarioId"]),
});
add(
  "/api/v1/replay/runs/{id}",
  "get",
  "Run state, position, dataset and event time",
);
add("/api/v1/replay/runs/{id}/control", "post", "Replay control", {
  body: body(
    {
      action: { enum: ["start", "pause", "resume", "step"] },
      speed: { type: "number", minimum: 0.1, maximum: 20 },
    },
    ["action"],
  ),
});
add(
  "/api/v1/observation-batches",
  "post",
  "Durable batch ingestion; identical retry returns 200",
  { status: 202, body: { $ref: "#/components/schemas/Batch" } },
);
add("/api/v1/jobs/{id}", "get", "Job state, attempts and error");
add("/api/v1/jobs/{id}/retry", "post", "Retry failed job; run becomes paused", {
  status: 202,
});
add("/api/v1/stations", "get", "Metadata, latest raw reading and assessment", {
  run: true,
});
add("/api/v1/stations/{id}", "get", "Station metadata");
const query = (name: string, required = false, schema: any = str) => ({
  name,
  in: "query",
  required,
  schema,
});
add(
  "/api/v1/stations/{id}/history",
  "get",
  "Ascending observation history, at most 31 days",
  {
    run: true,
    parameters: [
      query("from", true, { type: "string", format: "date-time" }),
      query("to", true, { type: "string", format: "date-time" }),
      query("cursor"),
      query("limit", false, { type: "integer", minimum: 1, maximum: 200 }),
    ],
  },
);
add("/api/v1/assessments", "get", "Assessment list ordered by ID", {
  run: true,
  parameters: ["stationId", "verdict", "cursor", "limit"].map((n) => query(n)),
});
add("/api/v1/assessments/{id}", "get", "Assessment evidence and model version");
add("/api/v1/stations/{id}/health", "get", "Per-channel health and coverage", {
  run: true,
});
add("/api/v1/corrections", "get", "Correction proposals and availability", {
  run: true,
});
add(
  "/api/v1/corrections/{id}/review",
  "post",
  "Audited proposal review, raw unchanged",
  {
    body: body({ decision: { enum: ["accepted", "rejected"] } }, ["decision"]),
  },
);
add(
  "/api/v1/evaluation",
  "get",
  "Historical evaluation artifacts and limitations",
);
add("/api/v1/events", "get", "SSE; connected event requires REST resync", {
  run: true,
});
paths["/api/v1/events"].get.responses["200"] = {
  description: "SSE stream",
  content: { "text/event-stream": { schema: str } },
};
const spec = {
  openapi: "3.1.0",
  info: {
    title: "SkyGuard backend",
    version: "1.0.0",
    description:
      "Local precomputed-feature replay. See docs/api.md for state semantics and limits.",
  },
  servers: [{ url: "http://localhost:8080" }],
  paths,
  components: {
    schemas: {
      Batch: z.toJSONSchema(batchSchema, { io: "input" }),
      Features: z.toJSONSchema(featuresSchema),
      Error: body(
        {
          error: body({ code: str, message: str, requestId: str }, [
            "code",
            "message",
            "requestId",
          ]),
        },
        ["error"],
      ),
    },
  },
};
await writeFile("docs/openapi.json", JSON.stringify(spec, null, 2) + "\n");
