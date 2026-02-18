"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./SearchBar.module.scss";

/**
 * Search bar component for finding records via Discogs API
 * Supports three search methods: catalog number, artist/title, and UPC code
 */

/**
 * A single search result returned by the Discogs search API,
 * optionally enriched with vinyl format details.
 */
interface DiscogsSearchResult {
  id: number;
  title: string;
  year?: string;
  thumb?: string;
  catno?: string;
  /** Record size extracted from Discogs format data (e.g., '12"', '7"') */
  recordSize?: string | null;
  /** Vinyl color extracted from format descriptions (e.g., "Blue Marble") */
  vinylColor?: string | null;
  /** True if this is a shaped or picture disc release */
  isShapedVinyl?: boolean;
}

interface SearchBarProps {
  onRecordAdded?: () => void;
}

export default function SearchBar({ onRecordAdded }: SearchBarProps) {
  const [searchMethod, setSearchMethod] = useState<
    "catalog" | "artistTitle" | "upc"
  >("artistTitle");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [upcCode, setUpcCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DiscogsSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Auto-clears the success message after 3 s.
   * The cleanup function cancels the timer if the component unmounts
   * before the timeout fires, avoiding a state update on an unmounted component.
   */
  useEffect(() => {
    if (!successMessage) return;
    const timerId = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timerId);
  }, [successMessage]);

  /**
   * Handles the search form submission
   * Calls the appropriate API endpoint based on selected search method
   */
  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSearching(true);
    setErrorMessage("");
    setSearchResults([]);

    try {
      let searchUrl = "/api/records/search?";

      if (searchMethod === "catalog" && catalogNumber.trim()) {
        searchUrl += `catalogNumber=${encodeURIComponent(catalogNumber.trim())}`;
      } else if (searchMethod === "artistTitle" && artistName.trim() && albumTitle.trim()) {
        searchUrl += `artist=${encodeURIComponent(artistName.trim())}&title=${encodeURIComponent(albumTitle.trim())}`;
      } else if (searchMethod === "upc" && upcCode.trim()) {
        searchUrl += `upc=${encodeURIComponent(upcCode.trim())}`;
      } else {
        setErrorMessage("Please fill in all required fields");
        setIsSearching(false);
        return;
      }

      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResults(data.results || []);
      setShowResults(true);

      if (data.results.length === 0) {
        setErrorMessage("No results found. Try a different search or add manually.");
      }
    } catch (error) {
      console.error("Search error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "An error occurred while searching"
      );
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handles adding a selected record to the collection
   * Fetches full details from Discogs and saves to database
   */
  const handleAddRecord = async (releaseId: number) => {
    try {
      const response = await fetch("/api/records/fetch-from-discogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add record");
      }

      setSuccessMessage(`Added "${data.record?.albumTitle ?? "record"}" to collection!`);
      // Timer is managed by the useEffect above — no inline setTimeout needed.
      onRecordAdded?.();
    } catch (error) {
      console.error("Error adding record:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to add record. Please try manual entry."
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* Search method tabs */}
      <div className={styles.tabs}>
        {(["artistTitle", "catalog", "upc"] as const).map((method) => {
          const label = method === "artistTitle" ? "Artist & Title"
            : method === "catalog" ? "Catalog #"
            : "UPC";
          return (
            <button
              key={method}
              type="button"
              onClick={() => setSearchMethod(method)}
              className={`${styles.tab}${searchMethod === method ? ` ${styles.active}` : ""}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className={styles.form}>
        {searchMethod === "artistTitle" && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Artist</label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className={styles.input}
                placeholder="e.g., Pink Floyd"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Album</label>
              <input
                type="text"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                className={styles.input}
                placeholder="e.g., The Dark Side of the Moon"
                required
              />
            </div>
          </>
        )}

        {searchMethod === "catalog" && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Catalog Number</label>
            <input
              type="text"
              value={catalogNumber}
              onChange={(e) => setCatalogNumber(e.target.value)}
              className={styles.input}
              placeholder="e.g., SHVL 804"
              required
            />
          </div>
        )}

        {searchMethod === "upc" && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>UPC Code</label>
            <input
              type="text"
              value={upcCode}
              onChange={(e) => setUpcCode(e.target.value)}
              className={styles.input}
              placeholder="e.g., 724384260804"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSearching}
          className={styles.searchBtn}
          title="Search Discogs"
        >
          {isSearching ? (
            <div className={styles.searchBtnSpinner} />
          ) : (
            <Image
              src="/discogs-logo.svg"
              alt="Search Discogs"
              width={32}
              height={32}
              style={{ filter: "invert(1) brightness(200%)" }}
            />
          )}
        </button>
      </form>

      {successMessage && (
        <div className={styles.successMsg}>{successMessage}</div>
      )}

      {errorMessage && (
        <div className={styles.errorMsg}>{errorMessage}</div>
      )}

      {showResults && searchResults.length > 0 && (
        <div className={styles.results}>
          <h3 className={styles.resultsHeading}>
            Results ({searchResults.length})
          </h3>
          <div className={styles.resultsList}>
            {searchResults.map((result) => (
              <div key={result.id} className={styles.resultItem}>
                {result.thumb && (
                  <Image
                    src={result.thumb}
                    alt={result.title}
                    width={48}
                    height={48}
                    className={styles.resultThumb}
                    unoptimized
                  />
                )}
                <div className={styles.resultInfo}>
                  <h4 className={styles.resultTitle}>{result.title}</h4>
                  <div className={styles.resultMeta}>
                    {result.year && <span>{result.year}</span>}
                    {result.catno && <span>Cat#: {result.catno}</span>}
                    {result.recordSize && <span>{result.recordSize}</span>}
                    {result.vinylColor && <span>{result.vinylColor}</span>}
                    {result.isShapedVinyl && (
                      <span className={styles.resultPicDisc}>Picture Disc</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAddRecord(result.id)}
                  className={styles.addBtn}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
