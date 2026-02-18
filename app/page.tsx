"use client";

import { useState, useCallback } from "react";
import RecordShelf from "@/components/records/RecordShelf";
import SearchBar from "@/components/records/SearchBar";
import styles from "./page.module.scss";

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
    <main className={styles.main}>
      {/* Header section */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.headerTitle}>My Record Collection</h1>
            <p className={styles.headerSubtitle}>
              Browse and manage your vinyl collection
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={styles.btnPrimary}
            >
              {isSyncing ? "Syncing..." : "Sync Collection"}
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={styles.btnSecondary}
            >
              {showSearch ? "Close" : "+ Add an album"}
            </button>
          </div>
        </div>
      </header>

      {/* Sync progress bar */}
      {syncProgress && syncProgress.phase !== "done" && (
        <div className={styles.syncBar}>
          <div className={styles.syncBarInner}>
            <div className={styles.syncStatus}>
              <span className={styles.syncPhase}>
                {syncProgress.phase === "pull"
                  ? "Pulling from Discogs..."
                  : "Pushing to Discogs..."}
              </span>
              <span>Imported: {syncProgress.pulled}</span>
              <span>Pushed: {syncProgress.pushed}</span>
              <span>Skipped: {syncProgress.skipped}</span>
              {syncProgress.totalDiscogsItems > 0 && (
                <span>
                  ({syncProgress.pulled + syncProgress.skipped} /{" "}
                  {syncProgress.totalDiscogsItems})
                </span>
              )}
            </div>
            {syncProgress.totalDiscogsItems > 0 && (
              <div className={styles.syncProgressTrack}>
                <div
                  className={styles.syncProgressFill}
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
        <div className={styles.syncErrors}>
          <div className={styles.syncErrorsInner}>
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
        <section className={styles.searchSection}>
          <div className={styles.searchSectionInner}>
            <SearchBar onRecordAdded={handleRecordAdded} />
          </div>
        </section>
      )}

      {/* Record shelf display */}
      <section className={styles.shelfSection}>
        <RecordShelf refreshKey={refreshKey} />
      </section>
    </main>
  );
}
