"use client";

import { useState } from "react";

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
    <div className="bg-warmBg-secondary p-6 rounded-lg shadow-md">
      {/* Search method selector */}
      <div className="mb-4">
        <label className="block text-warmText-primary font-semibold mb-2">
          Search Method
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setSearchMethod("artistTitle")}
            className={`px-4 py-2 rounded transition ${
              searchMethod === "artistTitle"
                ? "bg-warmAccent-orange text-white"
                : "bg-warmBg-tertiary text-warmText-secondary hover:bg-warmAccent-gold"
            }`}
          >
            Artist & Title
          </button>
          <button
            type="button"
            onClick={() => setSearchMethod("catalog")}
            className={`px-4 py-2 rounded transition ${
              searchMethod === "catalog"
                ? "bg-warmAccent-orange text-white"
                : "bg-warmBg-tertiary text-warmText-secondary hover:bg-warmAccent-gold"
            }`}
          >
            Catalog Number
          </button>
          <button
            type="button"
            onClick={() => setSearchMethod("upc")}
            className={`px-4 py-2 rounded transition ${
              searchMethod === "upc"
                ? "bg-warmAccent-orange text-white"
                : "bg-warmBg-tertiary text-warmText-secondary hover:bg-warmAccent-gold"
            }`}
          >
            UPC Code
          </button>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="space-y-4">
        {searchMethod === "artistTitle" && (
          <>
            <div>
              <label className="block text-warmText-primary mb-1">
                Artist Name
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full px-4 py-2 rounded border border-warmAccent-bronze focus:outline-none focus:ring-2 focus:ring-warmAccent-orange"
                placeholder="e.g., Pink Floyd"
                required
              />
            </div>
            <div>
              <label className="block text-warmText-primary mb-1">
                Album Title
              </label>
              <input
                type="text"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                className="w-full px-4 py-2 rounded border border-warmAccent-bronze focus:outline-none focus:ring-2 focus:ring-warmAccent-orange"
                placeholder="e.g., The Dark Side of the Moon"
                required
              />
            </div>
          </>
        )}

        {searchMethod === "catalog" && (
          <div>
            <label className="block text-warmText-primary mb-1">
              Catalog Number
            </label>
            <input
              type="text"
              value={catalogNumber}
              onChange={(e) => setCatalogNumber(e.target.value)}
              className="w-full px-4 py-2 rounded border border-warmAccent-bronze focus:outline-none focus:ring-2 focus:ring-warmAccent-orange"
              placeholder="e.g., SHVL 804"
              required
            />
          </div>
        )}

        {searchMethod === "upc" && (
          <div>
            <label className="block text-warmText-primary mb-1">UPC Code</label>
            <input
              type="text"
              value={upcCode}
              onChange={(e) => setUpcCode(e.target.value)}
              className="w-full px-4 py-2 rounded border border-warmAccent-bronze focus:outline-none focus:ring-2 focus:ring-warmAccent-orange"
              placeholder="e.g., 724384260804"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSearching}
          className="w-full bg-warmAccent-orange text-white py-3 rounded font-semibold hover:bg-warmAccent-copper transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? "Searching..." : "Search Discogs"}
        </button>
      </form>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {/* Search results */}
      {showResults && searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-warmText-primary mb-3">
            Search Results
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-4 p-3 bg-warmBg-primary rounded border border-warmAccent-bronze hover:shadow-md transition"
              >
                {result.thumb && (
                  <img
                    src={result.thumb}
                    alt={result.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-warmText-primary">
                    {result.title}
                  </h4>
                  {result.year && (
                    <p className="text-sm text-warmText-secondary">
                      {result.year}
                    </p>
                  )}
                  {result.catno && (
                    <p className="text-xs text-warmText-tertiary">
                      Cat#: {result.catno}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAddRecord(result.id)}
                  className="px-4 py-2 bg-warmAccent-orange text-white rounded hover:bg-warmAccent-copper transition"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
