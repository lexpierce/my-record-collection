"use client";

import { useState } from "react";
import RecordShelf from "@/components/records/RecordShelf";
import SearchBar from "@/components/records/SearchBar";

/**
 * Home page component for the record collection application
 * Displays the header, "Add an album" toggle, and the record shelf
 */
export default function HomePage() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <main className="min-h-screen">
      {/* Header section */}
      <header className="border-b border-warmBg-tertiary px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-warmText-primary tracking-tight">
              My Record Collection
            </h1>
            <p className="text-sm text-warmText-tertiary mt-0.5">
              Browse and manage your vinyl collection
            </p>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="px-5 py-2.5 bg-warmAccent-orange text-white font-medium text-sm hover:bg-warmAccent-copper transition-colors"
          >
            {showSearch ? "Close" : "+ Add an album"}
          </button>
        </div>
      </header>

      {/* Collapsible search interface */}
      {showSearch && (
        <section className="border-b border-warmBg-tertiary">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <SearchBar />
          </div>
        </section>
      )}

      {/* Record shelf display */}
      <section className="max-w-7xl mx-auto px-8 py-8">
        <RecordShelf />
      </section>
    </main>
  );
}
