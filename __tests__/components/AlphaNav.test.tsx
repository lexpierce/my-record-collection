/**
 * Tests for components/records/AlphaNav.tsx
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AlphaNav from "@/components/records/AlphaNav";
import type { AlphaBucket } from "@/lib/pagination/buckets";

const buckets: AlphaBucket[] = [
  { label: "A", recordIds: ["a1", "a2"] },
  { label: "B", recordIds: ["b1"] },
  { label: "N", recordIds: ["n1", "n2", "n3"] },
];

describe("AlphaNav", () => {
  it("renders All button", () => {
    render(<AlphaNav buckets={buckets} activeBucket={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All" })).toBeDefined();
  });

  it("renders one button per bucket", () => {
    render(<AlphaNav buckets={buckets} activeBucket={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^A$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^B$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^N$/ })).toBeDefined();
  });

  it("calls onSelect(null) when All clicked", () => {
    const onSelect = vi.fn();
    render(<AlphaNav buckets={buckets} activeBucket="B" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("calls onSelect with bucket label when a letter is clicked", () => {
    const onSelect = vi.fn();
    render(<AlphaNav buckets={buckets} activeBucket={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /^B$/ }));
    expect(onSelect).toHaveBeenCalledWith("B");
  });

  it("marks All as pressed when activeBucket is null", () => {
    render(<AlphaNav buckets={buckets} activeBucket={null} onSelect={vi.fn()} />);
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(allBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("marks active bucket button as pressed", () => {
    render(<AlphaNav buckets={buckets} activeBucket="N" onSelect={vi.fn()} />);
    const nBtn = screen.getByRole("button", { name: /^N$/ });
    expect(nBtn.getAttribute("aria-pressed")).toBe("true");
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(allBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("returns null when buckets is empty", () => {
    const { container } = render(
      <AlphaNav buckets={[]} activeBucket={null} onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
