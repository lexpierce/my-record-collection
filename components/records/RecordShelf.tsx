"use client";

import { useEffect, useState } from "react";
import RecordCard from "./RecordCard";
import type { Record } from "@/lib/db/schema";

/**
 * Record shelf component that displays all records in a grid layout
 * Shows album art as 1-inch squares (96px at 96 DPI) with title and artist
 */
export default function RecordShelf() {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Fetches all records from the database on component mount
   */
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
      <h2 className="text-sm font-medium text-warmText-tertiary mb-4">
        {records.length} {records.length === 1 ? "record" : "records"}
      </h2>

      {/* Grid layout for the record shelf */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-5">
        {records.map((record) => (
          <RecordCard key={record.recordId} record={record} />
        ))}
      </div>
    </div>
  );
}
