import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SyncProgress } from "@/lib/discogs/sync";

const { mockExecuteSync } = vi.hoisted(() => ({
  mockExecuteSync: vi.fn(),
}));

vi.mock("@/lib/discogs/sync", () => ({
  executeSync: mockExecuteSync,
}));

import { POST } from "@/src/pages/api/records/sync";

async function readStream(response: Response): Promise<SyncProgress[]> {
  const text = await response.text();
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => {
      const stripped = chunk.replace(/^data: /, "");
      try {
        return JSON.parse(stripped) as SyncProgress;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SyncProgress[];
}

const doneProgress: SyncProgress = {
  phase: "done",
  pulled: 3,
  pushed: 1,
  skipped: 2,
  errors: [],
  totalDiscogsItems: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExecuteSync.mockImplementation(async (callback: (progress: SyncProgress) => void) => {
    callback({ ...doneProgress, phase: "pull" });
    callback({ ...doneProgress, phase: "push" });
    return doneProgress;
  });
});

describe("POST /api/records/sync", () => {
  it("returns correct SSE headers", async () => {
    const response = await POST();
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("streams progress events and final done event", async () => {
    const response = await POST();
    const events = await readStream(response);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((event) => event.phase === "pull")).toBe(true);
    expect(events.some((event) => event.phase === "done")).toBe(true);
  });

  it("streams error event with phase=done when executeSync throws", async () => {
    mockExecuteSync.mockRejectedValueOnce(new Error("DISCOGS_USERNAME required"));
    const response = await POST();
    const events = await readStream(response);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.phase).toBe("done");
    expect(lastEvent.errors[0]).toContain("DISCOGS_USERNAME");
  });

  it("streams pulled/pushed counts correctly", async () => {
    const response = await POST();
    const events = await readStream(response);
    const doneEvent = events.find((event) => event.phase === "done");
    expect(doneEvent?.pulled).toBe(3);
    expect(doneEvent?.pushed).toBe(1);
  });
});
