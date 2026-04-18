/**
 * DietaryFilterBar — tests for the April 2026 polish pass. Locks in the
 * filter-bar regressions the user flagged: "205 spots" → "N of M
 * restaurants", Cuisine↔Type axis separator, ⌘K focus shortcut, city
 * display, List/Map toggle, and that the Dietary count badge reappears
 * when activeTags is non-empty.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../DietaryDrawer", () => ({
  __esModule: true,
  default: () => <div data-testid="drawer" />,
}));

import DietaryFilterBar from "../DietaryFilterBar";

function renderBar(overrides = {}) {
  const props = {
    search: "",
    onSearchChange: jest.fn(),
    cuisine: "All",
    cuisines: ["Italian", "Japanese"],
    onCuisineChange: jest.fn(),
    type: "All",
    onTypeChange: jest.fn(),
    sort: "Best Match",
    onSortChange: jest.fn(),
    activeTags: new Set(),
    onToggleTag: jest.fn(),
    onClearTags: jest.fn(),
    resultCount: 12,
    totalCount: 205,
    view: "list",
    onViewChange: jest.fn(),
    ...overrides,
  };
  return { ...render(<DietaryFilterBar {...props} />), props };
}

describe("DietaryFilterBar polish pass", () => {
  it("renders 'N of M restaurants' when totalCount is provided", () => {
    renderBar();
    expect(screen.getByText("12 of 205 restaurants")).toBeTruthy();
  });

  it("falls back to 'N restaurants' when totalCount is omitted", () => {
    renderBar({ totalCount: undefined, resultCount: 1 });
    expect(screen.getByText("1 restaurant")).toBeTruthy();
  });

  it("shows the ⌘K affordance chip in the search input", () => {
    const { container } = renderBar();
    expect(container.querySelector(".cwm-kbd")?.textContent).toBe("⌘K");
  });

  it("focuses the search input when ⌘K is pressed globally", () => {
    renderBar();
    const input = screen.getByLabelText(/Search restaurants/i);
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(document.activeElement).toBe(input);
  });

  it("renders the city pill with the provided city", () => {
    const { container } = renderBar({ city: "Brooklyn, NY" });
    expect(container.querySelector(".cwm-city-pill")?.textContent).toContain("Brooklyn, NY");
  });

  it("renders List/Map view toggle and calls onViewChange", () => {
    const { props } = renderBar({ view: "list" });
    const mapBtn = screen.getByRole("button", { name: /^Map$/ });
    fireEvent.click(mapBtn);
    expect(props.onViewChange).toHaveBeenCalledWith("map");
  });

  it("marks the active view button as pressed", () => {
    renderBar({ view: "map" });
    expect(screen.getByRole("button", { name: /^Map$/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^List$/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("renders axis separators between Cuisine/Type and Type/Dietary", () => {
    const { container } = renderBar();
    expect(container.querySelectorAll(".cwm-axis-sep").length).toBe(2);
  });

  it("shows the Dietary count badge when activeTags is non-empty", () => {
    const { container, rerender } = renderBar({ activeTags: new Set() });
    expect(container.querySelector(".cwm-dietary-badge")).toBeNull();
    rerender(
      <DietaryFilterBar
        search="" onSearchChange={() => {}}
        cuisine="All" cuisines={[]} onCuisineChange={() => {}}
        type="All" onTypeChange={() => {}}
        sort="Best Match" onSortChange={() => {}}
        activeTags={new Set(["Vegan", "Halal"])}
        onToggleTag={() => {}} onClearTags={() => {}}
        resultCount={3} totalCount={205}
        view="list" onViewChange={() => {}}
      />
    );
    expect(container.querySelector(".cwm-dietary-badge")?.textContent).toBe("2");
  });

  it("prefixes Sort with a ↕ icon and SORT: label", () => {
    const { container } = renderBar();
    expect(container.querySelector(".cwm-sort-icon")?.textContent).toBe("↕");
    expect(container.querySelector(".cwm-sort-label")?.textContent).toMatch(/Sort/i);
  });
});
