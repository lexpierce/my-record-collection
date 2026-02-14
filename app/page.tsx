"use client";

import { useState, useCallback } from "react";
import RecordShelf from "@/components/records/RecordShelf";
import SearchBar from "@/components/records/SearchBar";

interface SyncProgress {
  phase: "pull" | "push" | "done";
  pulled: number;
  pushed: number;
  skipped: number;
  errors: string[];
  totalDiscogsItems: number;
}

export default function HomePage() {
  const [showSearch, setShowSearch] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRecordAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncProgress(null);

    try {
      const res = await fetch("/api/records/sync", { method: "POST" });
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const stripped = line.replace(/^data: /, "");
          if (!stripped) continue;
          try {
            const data = JSON.parse(stripped) as SyncProgress;
            setSyncProgress(data);
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const stripped = buffer.replace(/^data: /, "");
        try {
          setSyncProgress(JSON.parse(stripped) as SyncProgress);
        } catch {
          // skip
        }
      }

      window.location.reload();
    } catch (err) {
      setSyncProgress({
        phase: "done",
        pulled: 0,
        pushed: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : "Sync failed"],
        totalDiscogsItems: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return (
    <main className="min-h-screen">
      {/* Header section */}
      <header className="bg-warmBg-primary border-b border-warmBg-tertiary px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-warmText-primary tracking-tight">
              My Record Collection
            </h1>
            <p className="text-sm text-warmText-tertiary mt-0.5">
              Browse and manage your vinyl collection
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-5 py-2.5 bg-warmAccent-bronze text-white font-medium text-sm hover:bg-warmAccent-copper transition-colors border-0 disabled:opacity-50"
            >
              {isSyncing ? "Syncing..." : "Sync Collection"}
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-5 py-2.5 bg-warmAccent-orange text-white font-medium text-sm hover:bg-warmAccent-copper transition-colors border-0"
            >
              {showSearch ? "Close" : "+ Add an album"}
            </button>
          </div>
        </div>
      </header>

      {/* Sync progress bar */}
      {syncProgress && syncProgress.phase !== "done" && (
        <div className="bg-warmBg-secondary border-b border-warmBg-tertiary px-8 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 text-sm text-warmText-secondary">
              <span className="font-medium text-warmText-primary">
                {syncProgress.phase === "pull" ? "Pulling from Discogs..." : "Pushing to Discogs..."}
              </span>
              <span>Imported: {syncProgress.pulled}</span>
              <span>Pushed: {syncProgress.pushed}</span>
              <span>Skipped: {syncProgress.skipped}</span>
              {syncProgress.totalDiscogsItems > 0 && (
                <span>
                  ({syncProgress.pulled + syncProgress.skipped} / {syncProgress.totalDiscogsItems})
                </span>
              )}
            </div>
            {syncProgress.totalDiscogsItems > 0 && (
              <div className="mt-2 h-1.5 bg-warmBg-tertiary overflow-hidden">
                <div
                  className="h-full bg-warmAccent-bronze transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      ((syncProgress.pulled + syncProgress.skipped) /
                        syncProgress.totalDiscogsItems) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync errors */}
      {syncProgress?.errors && syncProgress.errors.length > 0 && (
        <div className="bg-warmBg-secondary border-b border-warmBg-tertiary px-8 py-3">
          <div className="max-w-7xl mx-auto text-sm text-warmAccent-copper">
            {syncProgress.errors.slice(0, 5).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
            {syncProgress.errors.length > 5 && (
              <div>...and {syncProgress.errors.length - 5} more errors</div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible search interface */}
      {showSearch && (
        <section className="bg-warmBg-primary border-b border-warmBg-tertiary">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <SearchBar onRecordAdded={handleRecordAdded} />
          </div>
        </section>
      )}

      {/* Record shelf display */}
      <section className="max-w-7xl mx-auto px-8 py-8">
        <RecordShelf refreshKey={refreshKey} />
      </section>
    </main>
  );
}
