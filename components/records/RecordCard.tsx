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
            <div className="space-y-2">
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

                {/* Current value */}
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
              </div>
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
