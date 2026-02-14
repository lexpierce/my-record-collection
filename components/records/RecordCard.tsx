"use client";

import { useState } from "react";
import Image from "next/image";
import type { Record } from "@/lib/db/schema";

/**
 * Props for the RecordCard component
 */
interface RecordCardProps {
  record: Record;
}

/**
 * Record card component with flip animation
 * Front: Shows 1" album art with title and artist
 * Back: Shows detailed information (year, value, label)
 */
export default function RecordCard({ record }: RecordCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  /**
   * Toggles the flip state when the card is clicked
   */
  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  /**
   * Formats the current value for display
   */
  const formatValue = () => {
    if (!record.currentValueMinimum && !record.currentValueMedian) {
      return "Value not available";
    }

    const valueToDisplay =
      record.currentValueMedian || record.currentValueMinimum;
    const currency = record.valueCurrency || "USD";

    return `${currency} ${parseFloat(valueToDisplay || "0").toFixed(2)}`;
  };

  /**
   * Handles updating the record from Discogs
   * Fetches the latest information from Discogs and updates the database
   */
  const handleUpdateFromDiscogs = async () => {
    if (!record.discogsId) {
      alert("This record has no Discogs ID and cannot be updated.");
      return;
    }

    try {
      const response = await fetch("/api/records/update-from-discogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: record.recordId,
          discogsId: record.discogsId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update from Discogs");
      }

      alert("Record updated successfully! Refresh the page to see changes.");
      window.location.reload();
    } catch (error) {
      console.error("Error updating from Discogs:", error);
      alert("Failed to update record from Discogs. Please try again.");
    }
  };

  /**
   * Handles deleting the album from the collection
   * Confirms deletion before removing from database
   */
  const handleDeleteAlbum = async () => {
    const confirmDelete = confirm(
      `Are you sure you want to delete "${record.albumTitle}" by ${record.artistName} from your collection?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      // Use the correct endpoint path with [id] parameter
      const response = await fetch(`/api/records/${record.recordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete record");
      }

      alert("Record deleted successfully! Refresh the page to see changes.");
      window.location.reload();
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  return (
    <div
      className={`flip-card cursor-pointer ${isFlipped ? "flipped" : ""}`}
      onClick={handleCardClick}
    >
      <div className="flip-card-inner">
        {/* Front of card - Album art and basic info */}
        <div className="flip-card-front">
          <div className="flex flex-col items-center">
            {/* Album art - 1 inch (96px) square */}
            <div className="album-art-size mb-2 bg-warmBg-tertiary rounded shadow-md overflow-hidden">
              {record.thumbnailUrl ? (
                <Image
                  src={record.thumbnailUrl}
                  alt={`${record.albumTitle} by ${record.artistName}`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-warmAccent-bronze text-white text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Title and artist */}
            <div className="text-center">
              <h3 className="text-sm font-semibold text-warmText-primary line-clamp-2">
                {record.albumTitle}
              </h3>
              <p className="text-xs text-warmText-secondary line-clamp-1">
                {record.artistName}
              </p>
            </div>
          </div>
        </div>

        {/* Back of card - Detailed information */}
        <div className="flip-card-back bg-warmBg-secondary rounded shadow-md p-4">
          <div className="h-full flex flex-col justify-between">
            {/* Album info */}
            <div className="space-y-2 overflow-y-auto">
              <h3 className="text-sm font-bold text-warmText-primary line-clamp-2">
                {record.albumTitle}
              </h3>
              <p className="text-xs text-warmText-secondary line-clamp-1">
                {record.artistName}
              </p>

              <div className="border-t border-warmAccent-bronze pt-2 space-y-1">
                {/* Year released */}
                {record.yearReleased && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Year:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.yearReleased}
                    </span>
                  </div>
                )}

                {/* Record size */}
                {record.recordSize && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Size:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.recordSize}
                    </span>
                  </div>
                )}

                {/* Vinyl color */}
                {record.vinylColor && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Color:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.vinylColor}
                    </span>
                  </div>
                )}

                {/* Shaped vinyl */}
                {record.isShapedVinyl && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Type:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      Shaped/Picture Disc
                    </span>
                  </div>
                )}

                {/* Current value range */}
                <div className="text-xs">
                  <span className="font-semibold text-warmText-primary">
                    Value:
                  </span>{" "}
                  <span className="text-warmText-secondary">{formatValue()}</span>
                </div>

                {/* Label name */}
                {record.labelName && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Label:
                    </span>{" "}
                    <span className="text-warmText-secondary line-clamp-1">
                      {record.labelName}
                    </span>
                  </div>
                )}

                {/* Catalog number */}
                {record.catalogNumber && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Cat#:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.catalogNumber}
                    </span>
                  </div>
                )}

                {/* UPC code */}
                {record.upcCode && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      UPC:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.upcCode}
                    </span>
                  </div>
                )}

                {/* Genres */}
                {record.genres && record.genres.length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Genres:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.genres.join(", ")}
                    </span>
                  </div>
                )}

                {/* Styles */}
                {record.styles && record.styles.length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Styles:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.styles.join(", ")}
                    </span>
                  </div>
                )}

                {/* Data source */}
                <div className="text-xs">
                  <span className="font-semibold text-warmText-primary">
                    Source:
                  </span>{" "}
                  <span className="text-warmText-secondary capitalize">
                    {record.dataSource}
                  </span>
                </div>

                {/* Discogs ID */}
                {record.discogsId && (
                  <div className="text-xs">
                    <span className="font-semibold text-warmText-primary">
                      Discogs ID:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.discogsId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-3 pt-2 border-t border-warmAccent-bronze flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateFromDiscogs();
                }}
                className="flex-1 px-2 py-1 text-xs bg-warmAccent-bronze text-white rounded hover:bg-warmAccent-bronze/80 transition-colors"
              >
                Update from Discogs
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAlbum();
                }}
                className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete Album
              </button>
            </div>

            {/* Click hint */}
            <p className="text-xs text-warmText-tertiary italic mt-2">
              Click to flip back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
