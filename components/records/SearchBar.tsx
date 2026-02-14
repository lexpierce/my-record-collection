"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Inline Discogs "D" logo as SVG for the search button
 */
function DiscogsLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stylized "D" representing Discogs */}
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Search bar component for finding records via Discogs API
 * Supports three search methods: catalog number, artist/title, and UPC code
 */
export default function SearchBar() {
  const [searchMethod, setSearchMethod] = useState<
    "catalog" | "artistTitle" | "upc"
  >("artistTitle");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [upcCode, setUpcCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

      // Build query parameters based on selected search method
      if (searchMethod === "catalog" && catalogNumber) {
        searchUrl += `catalogNumber=${encodeURIComponent(catalogNumber)}`;
      } else if (searchMethod === "artistTitle" && artistName && albumTitle) {
        searchUrl += `artist=${encodeURIComponent(
          artistName
        )}&title=${encodeURIComponent(albumTitle)}`;
      } else if (searchMethod === "upc" && upcCode) {
        searchUrl += `upc=${encodeURIComponent(upcCode)}`;
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

      // Success - refresh the page to show the new record
      alert("Record added to collection!");
      window.location.reload();
    } catch (error) {
      console.error("Error adding record:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to add record. Please try manual entry."
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search method selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSearchMethod("artistTitle")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            searchMethod === "artistTitle"
              ? "bg-warmAccent-bronze text-white"
              : "bg-warmBg-tertiary text-warmText-secondary hover:bg-warmBg-secondary"
          }`}
        >
          Artist & Title
        </button>
        <button
          type="button"
          onClick={() => setSearchMethod("catalog")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            searchMethod === "catalog"
              ? "bg-warmAccent-bronze text-white"
              : "bg-warmBg-tertiary text-warmText-secondary hover:bg-warmBg-secondary"
          }`}
        >
          Catalog #
        </button>
        <button
          type="button"
          onClick={() => setSearchMethod("upc")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            searchMethod === "upc"
              ? "bg-warmAccent-bronze text-white"
              : "bg-warmBg-tertiary text-warmText-secondary hover:bg-warmBg-secondary"
          }`}
        >
          UPC
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 items-end">
        {searchMethod === "artistTitle" && (
          <>
            <div className="flex-1">
              <label className="block text-xs font-medium text-warmText-tertiary mb-1">
                Artist
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full px-3 py-2 bg-warmBg-primary border border-warmBg-tertiary focus:outline-none focus:border-warmAccent-bronze text-warmText-primary text-sm"
                placeholder="e.g., Pink Floyd"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-warmText-tertiary mb-1">
                Album
              </label>
              <input
                type="text"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                className="w-full px-3 py-2 bg-warmBg-primary border border-warmBg-tertiary focus:outline-none focus:border-warmAccent-bronze text-warmText-primary text-sm"
                placeholder="e.g., The Dark Side of the Moon"
                required
              />
            </div>
          </>
        )}

        {searchMethod === "catalog" && (
          <div className="flex-1">
            <label className="block text-xs font-medium text-warmText-tertiary mb-1">
              Catalog Number
            </label>
            <input
              type="text"
              value={catalogNumber}
              onChange={(e) => setCatalogNumber(e.target.value)}
              className="w-full px-3 py-2 bg-warmBg-primary border border-warmBg-tertiary focus:outline-none focus:border-warmAccent-bronze text-warmText-primary text-sm"
              placeholder="e.g., SHVL 804"
              required
            />
          </div>
        )}

        {searchMethod === "upc" && (
          <div className="flex-1">
            <label className="block text-xs font-medium text-warmText-tertiary mb-1">
              UPC Code
            </label>
            <input
              type="text"
              value={upcCode}
              onChange={(e) => setUpcCode(e.target.value)}
              className="w-full px-3 py-2 bg-warmBg-primary border border-warmBg-tertiary focus:outline-none focus:border-warmAccent-bronze text-warmText-primary text-sm"
              placeholder="e.g., 724384260804"
              required
            />
          </div>
        )}

        {/* Search button with Discogs vinyl icon */}
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 bg-warmAccent-orange text-white hover:bg-warmAccent-copper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Search Discogs"
        >
          {isSearching ? (
            <span className="text-sm">Searching...</span>
          ) : (
            <>
              <DiscogsLogo className="w-5 h-5" />
              <span className="text-sm font-medium">Search</span>
            </>
          )}
        </button>
      </form>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-warmAccent-orange/10 border border-warmAccent-orange/30 text-warmAccent-copper text-sm">
          {errorMessage}
        </div>
      )}

      {/* Search results */}
      {showResults && searchResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-warmText-primary mb-3">
            Results ({searchResults.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-3 p-3 bg-warmBg-primary border border-warmBg-tertiary hover:border-warmAccent-bronze transition-colors"
              >
                {result.thumb && (
                  <Image
                    src={result.thumb}
                    alt={result.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover"
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-warmText-primary truncate">
                    {result.title}
                  </h4>
                  <div className="flex gap-3 text-xs text-warmText-tertiary">
                    {result.year && <span>{result.year}</span>}
                    {result.catno && <span>Cat#: {result.catno}</span>}
                    {result.recordSize && <span>{result.recordSize}</span>}
                    {result.vinylColor && <span>{result.vinylColor}</span>}
                    {result.isShapedVinyl && (
                      <span className="text-warmAccent-orange">Picture Disc</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAddRecord(result.id)}
                  className="px-3 py-1.5 bg-warmAccent-bronze text-white text-xs font-medium hover:bg-warmAccent-copper transition-colors"
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
