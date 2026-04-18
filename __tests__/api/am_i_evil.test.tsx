/**
 * Tests for /am_i_evil (health check page)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HealthCheck from "@/app/am_i_evil/page";
import HealthCheckLayout from "@/app/am_i_evil/layout";

describe("/am_i_evil health check page", () => {
  it("renders yes_i_am text", () => {
    render(<HealthCheck />);
    expect(screen.getByText("yes_i_am")).toBeDefined();
  });

  it("sets green background on body via layout style tag", () => {
    render(<HealthCheckLayout><div /></HealthCheckLayout>);
    const style = document.querySelector("style");
    expect(style?.textContent).toContain("background-color: green");
  });
});
