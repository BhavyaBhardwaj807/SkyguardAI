import { randomUUID } from "node:crypto";
import type { Response } from "express";
export class Events {
  private clients = new Map<Response, string>();
  subscribe(res: Response, runId: string) {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write('event: connected\ndata: {"resyncRequired":true}\n\n');
    this.clients.set(res, runId);
    const timer = setInterval(() => {
      if (!res.write(": heartbeat\n\n")) res.end();
    }, 15000);
    res.on("close", () => {
      clearInterval(timer);
      this.clients.delete(res);
    });
  }
  emit(type: string, runId: string, data: Record<string, unknown> = {}) {
    const id = randomUUID();
    const message = `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify({ id, runId, emittedAt: new Date().toISOString(), ...data })}\n\n`;
    for (const [res, run] of this.clients)
      if (run === runId && !res.write(message)) res.end();
  }
  close() {
    for (const res of this.clients.keys()) res.end();
    this.clients.clear();
  }
}
