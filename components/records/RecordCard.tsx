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
        <div className="flip-card-front p-1.5">
          <div className="flex flex-col items-center">
            <div className="album-art-size bg-warmBg-tertiary overflow-hidden">
              {record.thumbnailUrl ? (
                <Image
                  src={record.thumbnailUrl}
                  alt={`${record.albumTitle} by ${record.artistName}`}
                  width={144}
                  height={144}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-warmAccent-bronze text-white text-xs">
                  No Image
                </div>
              )}
            </div>
            <h3 className="text-[11px] font-semibold text-warmText-primary truncate w-full text-center mt-1 leading-none">
              {record.albumTitle}
            </h3>
            <p className="text-[11px] text-warmText-secondary truncate w-full text-center leading-none mt-0.5">
              {record.artistName}
            </p>
          </div>
        </div>

        {/* Back of card - Detailed information */}
        <div className="flip-card-back bg-warmBg-secondary p-3">
          <div className="flex flex-col space-y-2">
            {/* Album thumbnail */}
            <div className="album-art-size mx-auto mb-2 bg-warmBg-tertiary overflow-hidden">
              {record.thumbnailUrl ? (
                <Image
                  src={record.thumbnailUrl}
                  alt={`${record.albumTitle} by ${record.artistName}`}
                  width={144}
                  height={144}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-warmAccent-bronze text-white text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Album info */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-warmText-primary">
                {record.albumTitle}
              </h3>
              <p className="text-[10px] text-warmText-secondary">
                {record.artistName}
              </p>

              <div className="border-t border-warmAccent-bronze pt-1 space-y-0.5">
                {/* Year released */}
                {record.yearReleased && (
                  <div className="text-[10px]">
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
                  <div className="text-[10px]">
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
                  <div className="text-[10px]">
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
                  <div className="text-[10px]">
                    <span className="font-semibold text-warmText-primary">
                      Type:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      Shaped/Picture Disc
                    </span>
                  </div>
                )}

                {/* Current value range */}
                <div className="text-[10px]">
                  <span className="font-semibold text-warmText-primary">
                    Value:
                  </span>{" "}
                  <span className="text-warmText-secondary">{formatValue()}</span>
                </div>

                {/* Label name */}
                {record.labelName && (
                  <div className="text-[10px]">
                    <span className="font-semibold text-warmText-primary">
                      Label:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.labelName}
                    </span>
                  </div>
                )}

                {/* Catalog number */}
                {record.catalogNumber && (
                  <div className="text-[10px]">
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
                  <div className="text-[10px]">
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
                  <div className="text-[10px]">
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
                  <div className="text-[10px]">
                    <span className="font-semibold text-warmText-primary">
                      Styles:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.styles.join(", ")}
                    </span>
                  </div>
                )}

                {/* Data source */}
                <div className="text-[10px]">
                  <span className="font-semibold text-warmText-primary">
                    Source:
                  </span>{" "}
                  <span className="text-warmText-secondary capitalize">
                    {record.dataSource}
                  </span>
                </div>

                {/* Discogs ID */}
                {record.discogsId && (
                  <div className="text-[10px]">
                    <span className="font-semibold text-warmText-primary">
                      Discogs ID:
                    </span>{" "}
                    <span className="text-warmText-secondary">
                      {record.discogsId}
                    </span>
                  </div>
                )}

                {/* Synced with Discogs */}
                {record.isSyncedWithDiscogs && (
                  <div className="text-[10px]">
                    <span className="font-semibold text-warmText-primary">Synced:</span>{" "}
                    <span className="text-warmAccent-bronze">&#10003;</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-2 pt-2 border-t border-warmAccent-bronze flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateFromDiscogs();
                }}
                className="px-2 py-1 text-[10px] bg-warmAccent-bronze text-white hover:bg-warmAccent-copper transition-colors whitespace-nowrap"
              >
                Update
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAlbum();
                }}
                className="px-2 py-1 text-[10px] bg-warmAccent-copper text-white hover:bg-warmAccent-bronze transition-colors whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
