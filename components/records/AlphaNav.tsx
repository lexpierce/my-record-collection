/**
 * AlphaNav — horizontal alphabetical bucket navigation bar.
 *
 * Renders an "All" button followed by one button per bucket. Clicking a bucket
 * filters the shelf to only that bucket's records. Clicking "All" clears the
 * selection.
 *
 * Only shown when the shelf is sorted by artist (the only sort key for which
 * alphabetical bucketing is meaningful).
 */

import type { AlphaBucket } from "@/lib/pagination/buckets";
import styles from "./AlphaNav.module.scss";

interface AlphaNavProps {
  buckets: AlphaBucket[];
  activeBucket: string | null;
  onSelect: (label: string | null) => void;
}

export default function AlphaNav({ buckets, activeBucket, onSelect }: AlphaNavProps) {
  if (buckets.length === 0) return null;

  return (
    <nav className={styles.nav} aria-label="Alphabetical filter">
      <button
        className={`${styles.btn} ${activeBucket === null ? styles.active : ""}`}
        onClick={() => onSelect(null)}
        aria-pressed={activeBucket === null}
      >
        All
      </button>
      {buckets.map((bucket) => (
        <button
          key={bucket.label}
          className={`${styles.btn} ${activeBucket === bucket.label ? styles.active : ""}`}
          onClick={() => onSelect(bucket.label)}
          aria-pressed={activeBucket === bucket.label}
          title={`${bucket.recordIds.length} record${bucket.recordIds.length === 1 ? "" : "s"}`}
        >
          {bucket.label}
        </button>
      ))}
    </nav>
  );
}
