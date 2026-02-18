/**
 * RecordCard — a flip card that shows album art on the front and full metadata
 * on the back.
 *
 * Flip mechanic:
 *   The card expands from 180 px to 250 px on flip. To avoid clipping at the
 *   viewport edges, a useEffect computes asymmetric negative margins: the
 *   70 px of extra width is split evenly (-35 px each side) then shifted away
 *   from whichever edge is too close. Global CSS classes (flip-card, flipped,
 *   etc.) from styles/globals.scss drive the 3D CSS transform.
 *
 * Actions (back of card):
 *   Update — re-fetches data from Discogs and saves it to the DB.
 *   Delete  — removes the record from the DB after an inline confirmation UI.
 *   Both call onRecordMutated() on success so the parent shelf re-fetches
 *   without a full page reload.
 *
 * Inline confirmation / error:
 *   confirmDeleteVisible — shows "Are you sure? [Yes] [No]" below Delete button.
 *   actionError         — shows an inline error message for failed actions.
 *   Neither uses blocking window.alert() or window.confirm() dialogs.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { Record } from "@/lib/db/schema";
import styles from "./RecordCard.module.scss";

/**
 * Props for the RecordCard component
 */
interface RecordCardProps {
  record: Record;
  onRecordMutated: () => void;
}

/**
 * Record card component with flip animation
 * Front: Shows album art with title and artist
 * Back: Shows detailed information and action buttons
 */
export default function RecordCard({ record, onRecordMutated }: RecordCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  // Inline delete confirmation — shown below the Delete button
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  // Inline error message for failed Update / Delete actions
  const [actionError, setActionError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (isFlipped) {
      const rect = el.getBoundingClientRect();
      const extra = 70; // 250px - 180px
      const half = extra / 2;

      let ml = -half;
      let mr = -half;

      // Shift expansion away from whichever edge is too close
      const spaceRight = window.innerWidth - rect.right;
      if (spaceRight < half) {
        const shift = half - spaceRight;
        ml -= shift;
        mr += shift;
      }
      const spaceLeft = rect.left;
      if (spaceLeft < Math.abs(ml)) {
        const shift = Math.abs(ml) - spaceLeft;
        ml += shift;
        mr -= shift;
      }

      el.style.marginLeft = `${ml}px`;
      el.style.marginRight = `${mr}px`;
    } else {
      el.style.marginLeft = "";
      el.style.marginRight = "";
    }
  }, [isFlipped]);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  /**
   * Handles updating the record from Discogs.
   * Shows an inline error instead of alert() on failure.
   */
  const handleUpdateFromDiscogs = async () => {
    setActionError(null);

    if (!record.discogsId) {
      setActionError("This record has no Discogs ID and cannot be updated.");
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

      onRecordMutated();
    } catch (error) {
      console.error("Error updating from Discogs:", error);
      setActionError("Failed to update record from Discogs. Please try again.");
    }
  };

  /**
   * First click: reveals the "Are you sure?" inline prompt.
   * Called by the "Yes" button in that prompt to actually perform the delete.
   */
  const handleDeleteRequest = () => {
    setActionError(null);
    setConfirmDeleteVisible(true);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteVisible(false);
  };

  const handleDeleteConfirm = async () => {
    setConfirmDeleteVisible(false);

    try {
      const response = await fetch(`/api/records/${record.recordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete record");
      }

      onRecordMutated();
    } catch (error) {
      console.error("Error deleting record:", error);
      setActionError("Failed to delete record. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    // flip-card / flipped are global classes (see styles/globals.scss)
    <div
      ref={cardRef}
      className={`flip-card${isFlipped ? " flipped" : ""}`}
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-expanded={isFlipped}
      aria-label={`${record.albumTitle} by ${record.artistName}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flip-card-inner">
        {/* Front of card */}
        <div className="flip-card-front">
          <div className={styles.cardFrontContent}>
            <div className={`album-art-size ${styles.albumArtWrapper}`}>
              {record.thumbnailUrl ? (
                <Image
                  src={record.thumbnailUrl}
                  alt={`${record.albumTitle} by ${record.artistName}`}
                  width={144}
                  height={144}
                />
              ) : (
                <div className={styles.noImagePlaceholder}>No Image</div>
              )}
            </div>
            <h3 className={styles.albumTitle}>{record.albumTitle}</h3>
            <p className={styles.albumArtist}>{record.artistName}</p>
          </div>
        </div>

        {/* Back of card */}
        <div className="flip-card-back">
          <div className={styles.cardBack}>
            <div className={`album-art-size-lg ${styles.albumArtWrapperLg}`}>
              {record.thumbnailUrl ? (
                <Image
                  src={record.thumbnailUrl}
                  alt={`${record.albumTitle} by ${record.artistName}`}
                  width={216}
                  height={216}
                />
              ) : (
                <div className={styles.noImagePlaceholder}>No Image</div>
              )}
            </div>

            <div>
              <h3 className={styles.metaTitle}>{record.albumTitle}</h3>
              <p className={styles.metaArtist}>{record.artistName}</p>

              <div className={styles.metaSection}>
                {record.yearReleased && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Year:</span>{" "}
                    <span className={styles.metaValue}>{record.yearReleased}</span>
                  </div>
                )}
                {record.recordSize && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Size:</span>{" "}
                    <span className={styles.metaValue}>{record.recordSize}</span>
                  </div>
                )}
                {record.vinylColor && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Color:</span>{" "}
                    <span className={styles.metaValue}>{record.vinylColor}</span>
                  </div>
                )}
                {record.isShapedVinyl && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Type:</span>{" "}
                    <span className={styles.metaValue}>Shaped/Picture Disc</span>
                  </div>
                )}
                {record.labelName && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Label:</span>{" "}
                    <span className={styles.metaValue}>{record.labelName}</span>
                  </div>
                )}
                {record.catalogNumber && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Cat#:</span>{" "}
                    <span className={styles.metaValue}>{record.catalogNumber}</span>
                  </div>
                )}
                {record.upcCode && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>UPC:</span>{" "}
                    <span className={styles.metaValue}>{record.upcCode}</span>
                  </div>
                )}
                {record.genres && record.genres.length > 0 && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Genres:</span>{" "}
                    <span className={styles.metaValue}>{record.genres.join(", ")}</span>
                  </div>
                )}
                {record.styles && record.styles.length > 0 && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Styles:</span>{" "}
                    <span className={styles.metaValue}>{record.styles.join(", ")}</span>
                  </div>
                )}
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Source:</span>{" "}
                  <span className={styles.metaValue} style={{ textTransform: "capitalize" }}>
                    {record.dataSource}
                  </span>
                </div>
                {record.discogsId && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Discogs ID:</span>{" "}
                    <span className={styles.metaValue}>{record.discogsId}</span>
                  </div>
                )}
                {/* discogsUri: rendered as a link to the Discogs release page */}
                {record.discogsUri && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Discogs:</span>{" "}
                    <a
                      href={record.discogsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.metaLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Discogs
                    </a>
                  </div>
                )}
                {record.isSyncedWithDiscogs && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Synced:</span>{" "}
                    <span className={styles.metaValueAccent}>&#10003;</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateFromDiscogs();
                }}
                className={styles.btnUpdate}
              >
                Update
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRequest();
                }}
                className={styles.btnDelete}
              >
                Delete
              </button>

              {/* Inline delete confirmation — replaces window.confirm() */}
              {confirmDeleteVisible && (
                <div
                  className={styles.confirmDelete}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={styles.confirmDeleteText}>Are you sure?</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConfirm();
                    }}
                    className={styles.btnConfirmYes}
                  >
                    Yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCancel();
                    }}
                    className={styles.btnConfirmNo}
                  >
                    No
                  </button>
                </div>
              )}

              {/* Inline error — replaces window.alert() */}
              {actionError && (
                <div
                  className={styles.actionError}
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
