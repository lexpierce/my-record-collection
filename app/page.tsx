import RecordShelf from "@/components/records/RecordShelf";
import SearchBar from "@/components/records/SearchBar";

/**
 * Home page component for the record collection application
 * Displays the search interface and the record shelf
 */
export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      {/* Header section */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-warmText-primary mb-2">
          My Record Collection
        </h1>
        <p className="text-warmText-secondary">
          Browse and manage your vinyl collection
        </p>
      </header>

      {/* Search interface */}
      <section className="mb-8">
        <SearchBar />
      </section>

      {/* Record shelf display */}
      <section>
        <RecordShelf />
      </section>
    </main>
  );
}
