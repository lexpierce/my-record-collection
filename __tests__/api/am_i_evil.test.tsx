/**
 * Tests for /am_i_evil (health check page)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HealthCheck from "@/app/am_i_evil/page";

describe("/am_i_evil health check page", () => {
  it("renders yes_i_am text", () => {
    render(<HealthCheck />);
    expect(screen.getByText("yes_i_am")).toBeDefined();
  });

  it("has green background", () => {
    render(<HealthCheck />);
    const el = screen.getByText("yes_i_am");
    expect(el.style.backgroundColor).toBe("green");
  });
});
