"use client";

import { useEffect, useState, useMemo } from "react";
import RecordCard from "./RecordCard";
import type { Record } from "@/lib/db/schema";

type SortBy = "artist" | "title" | "year";

export default function RecordShelf() {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("artist");

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
  }, []);

  const sortedRecords = useMemo(() => {
    // Strip leading "The ", "A " and normalize accents for artist sorting
    const artistSortKey = (name: string) =>
      name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/^(The|A)\s+/i, "");

    const sorted = [...records];
    switch (sortBy) {
      case "artist":
        return sorted.sort((a, b) => {
          const cmp = artistSortKey(a.artistName).localeCompare(
            artistSortKey(b.artistName),
          );
          if (cmp !== 0) return cmp;
          return (a.yearReleased ?? 9999) - (b.yearReleased ?? 9999);
        });
      case "title":
        return sorted.sort((a, b) => a.albumTitle.localeCompare(b.albumTitle));
      case "year":
        return sorted.sort(
          (a, b) => (b.yearReleased ?? 0) - (a.yearReleased ?? 0),
        );
    }
  }, [records, sortBy]);

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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-x-5 gap-y-0">
        {sortedRecords.map((record) => (
          <RecordCard key={record.recordId} record={record} />
        ))}
      </div>
    </div>
  );
}
