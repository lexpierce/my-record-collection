/**
 * RecordShelf — the main browsing grid.
 *
 * Fetches all records from /api/records on mount and whenever `refreshKey`
 * changes (parent bumps it after a sync or add).
 *
 * Sorting:
 *   Artist sort strips "The"/"A" prefixes and diacritics before comparing so
 *   "The Beatles" sorts as "Beatles". Secondary sort for artist mode is year.
 *
 * Filtering:
 *   Records can be filtered by size (checkbox list derived from actual data)
 *   and by shaped/picture-disc status. Active filter count is shown on the
 *   filter button as a badge. "X of Y shown" appears when filters are active.
 *
 * effectiveSize:
 *   If a record has no explicit recordSize, it defaults to '12"' (the most
 *   common format) unless it is a shaped vinyl, in which case "Unknown".
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import RecordCard from "./RecordCard";
import type { Record } from "@/lib/db/schema";
import styles from "./RecordShelf.module.scss";

type SortBy = "artist" | "title" | "year";

interface RecordShelfProps {
  refreshKey?: number;
}

export default function RecordShelf({ refreshKey = 0 }: RecordShelfProps) {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("artist");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sizeFilter, setSizeFilter] = useState<Set<string>>(new Set());
  const [shapedOnly, setShapedOnly] = useState(false);
  // Bumped by onRecordMutated to re-fetch after a card update or delete
  const [mutationKey, setMutationKey] = useState(0);

  const handleRecordMutated = useCallback(() => {
    setMutationKey((k) => k + 1);
  }, []);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const response = await fetch("/api/records");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch records");
        }

        setRecords(data.records || []);
      } catch (error) {
        console.error("Error fetching records:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load records"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecords();
  }, [refreshKey, mutationKey]);

  const effectiveSize = (r: Record) =>
    r.recordSize || (r.isShapedVinyl ? "Unknown" : '12"');

  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    for (const r of records) {
      sizes.add(effectiveSize(r));
    }
    return [...sizes].sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (sizeFilter.size > 0) {
      result = result.filter((r) => sizeFilter.has(effectiveSize(r)));
    }
    if (shapedOnly) {
      result = result.filter((r) => r.isShapedVinyl);
    }
    return result;
  }, [records, sizeFilter, shapedOnly]);

  const activeFilterCount = (sizeFilter.size > 0 ? 1 : 0) + (shapedOnly ? 1 : 0);

  const sortedRecords = useMemo(() => {
    const artistSortKey = (name: string) =>
      name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/^(The|A)\s+/i, "")
        .replace(/^[^a-zA-Z0-9]+/, "");

    const dir = sortAsc ? 1 : -1;
    const sorted = [...filteredRecords];
    switch (sortBy) {
      case "artist":
        return sorted.sort((a, b) => {
          const cmp = artistSortKey(a.artistName).localeCompare(
            artistSortKey(b.artistName),
          );
          if (cmp !== 0) return cmp * dir;
          return ((a.yearReleased ?? 9999) - (b.yearReleased ?? 9999)) * dir;
        });
      case "title":
        return sorted.sort(
          (a, b) => a.albumTitle.localeCompare(b.albumTitle) * dir,
        );
      case "year":
        return sorted.sort(
          (a, b) => ((b.yearReleased ?? 0) - (a.yearReleased ?? 0)) * dir,
        );
    }
  }, [filteredRecords, sortBy, sortAsc]);

  if (isLoading) {
    return (
      <div className={styles.stateCenter}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading your collection...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.stateCenter}>
        <p className={styles.errorText}>{errorMessage}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className={styles.stateCenter}>
        <p className={styles.emptyText}>
          Your collection is empty. Click <strong>&ldquo;+ Add an album&rdquo;</strong> to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.controls}>
        <h2 className={styles.recordCount}>
          {records.length} {records.length === 1 ? "record" : "records"}
        </h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className={styles.sortSelect}
        >
          <option value="artist">Artist</option>
          <option value="title">Title</option>
          <option value="year">Year</option>
        </select>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className={styles.sortDirBtn}
          title={sortAsc ? "Ascending" : "Descending"}
        >
          {sortAsc ? "\u25B2" : "\u25BC"}
        </button>
        <div className={styles.filterWrapper}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterBtn}${activeFilterCount > 0 ? ` ${styles.active}` : ""}`}
            title="Filter"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
          {showFilters && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterGroupLabel}>Size</div>
              {uniqueSizes.map((size) => (
                <label key={size} className={styles.filterCheckLabel}>
                  <input
                    type="checkbox"
                    checked={sizeFilter.has(size)}
                    onChange={() => {
                      setSizeFilter((prev) => {
                        const next = new Set(prev);
                        if (next.has(size)) next.delete(size);
                        else next.add(size);
                        return next;
                      });
                    }}
                  />
                  {size}
                </label>
              ))}
              <div className={styles.filterDivider} />
              <label className={styles.filterCheckLabel}>
                <input
                  type="checkbox"
                  checked={shapedOnly}
                  onChange={() => setShapedOnly(!shapedOnly)}
                />
                Picture disc / Shaped only
              </label>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSizeFilter(new Set());
                    setShapedOnly(false);
                  }}
                  className={styles.filterClearBtn}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        {activeFilterCount > 0 && (
          <span className={styles.filterResultCount}>
            {sortedRecords.length} of {records.length} shown
          </span>
        )}
      </div>

      <div className={styles.grid}>
        {sortedRecords.map((record) => (
          <RecordCard key={record.recordId} record={record} onRecordMutated={handleRecordMutated} />
        ))}
      </div>
    </div>
  );
}
