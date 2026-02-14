"use client";

import { useEffect, useState, useMemo } from "react";
import RecordCard from "./RecordCard";
import type { Record } from "@/lib/db/schema";

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
  }, [refreshKey]);

  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    for (const r of records) {
      sizes.add(r.recordSize || "Unknown");
    }
    return [...sizes].sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (sizeFilter.size > 0) {
      result = result.filter((r) => sizeFilter.has(r.recordSize || "Unknown"));
    }
    if (shapedOnly) {
      result = result.filter((r) => r.isShapedVinyl);
    }
    return result;
  }, [records, sizeFilter, shapedOnly]);

  const activeFilterCount = (sizeFilter.size > 0 ? 1 : 0) + (shapedOnly ? 1 : 0);

  const sortedRecords = useMemo(() => {
    // Strip leading "The ", "A " and normalize accents for artist sorting
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
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-warmBg-tertiary border-t-warmAccent-bronze rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-warmText-tertiary">
          Loading your collection...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="text-center py-16">
        <p className="text-warmAccent-copper text-sm">{errorMessage}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-warmText-tertiary">
          Your collection is empty. Click <strong>&ldquo;+ Add an album&rdquo;</strong> to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-medium text-warmText-tertiary">
          {records.length} {records.length === 1 ? "record" : "records"}
        </h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="text-sm bg-warmBg-primary border border-warmBg-tertiary text-warmText-secondary px-2 py-1 focus:outline-none focus:border-warmAccent-bronze"
        >
          <option value="artist">Artist</option>
          <option value="title">Title</option>
          <option value="year">Year</option>
        </select>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="text-sm text-warmText-secondary hover:text-warmText-primary transition-colors px-1"
          title={sortAsc ? "Ascending" : "Descending"}
        >
          {sortAsc ? "\u25B2" : "\u25BC"}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-sm px-2 py-1 border transition-colors ${
              activeFilterCount > 0
                ? "border-warmAccent-bronze text-warmAccent-bronze"
                : "border-warmBg-tertiary text-warmText-secondary hover:text-warmText-primary"
            }`}
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          {showFilters && (
            <div className="absolute top-full left-0 mt-1 bg-warmBg-primary border border-warmBg-tertiary shadow-lg p-3 z-50 min-w-[180px]">
              <div className="text-xs font-semibold text-warmText-primary mb-2">Size</div>
              {uniqueSizes.map((size) => (
                <label key={size} className="flex items-center gap-2 text-xs text-warmText-secondary py-0.5 cursor-pointer">
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
                    className="accent-warmAccent-bronze"
                  />
                  {size}
                </label>
              ))}
              <div className="border-t border-warmBg-tertiary mt-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-warmText-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shapedOnly}
                    onChange={() => setShapedOnly(!shapedOnly)}
                    className="accent-warmAccent-bronze"
                  />
                  Picture disc / Shaped only
                </label>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSizeFilter(new Set());
                    setShapedOnly(false);
                  }}
                  className="mt-2 text-xs text-warmAccent-copper hover:text-warmAccent-bronze transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        {activeFilterCount > 0 && (
          <span className="text-xs text-warmText-tertiary">
            {sortedRecords.length} of {records.length} shown
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-x-5 gap-y-0">
        {sortedRecords.map((record) => (
          <RecordCard key={record.recordId} record={record} />
        ))}
      </div>
    </div>
  );
}
