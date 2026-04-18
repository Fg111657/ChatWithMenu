/**
 * Tests for RestaurantCard — specifically the photo fallback logic that
 * regressed in the earlier build (users saw a blank blue gradient when
 * Google's photo proxy errored, instead of the logo-mark fallback).
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../../services/discoveryApi", () => ({
  __esModule: true,
  default: {
    restaurantPhotoUrl: (id, i) => `/api/restaurant/${id}/photo/${i}`,
  },
  restaurantPhotoUrl: (id, i) => `/api/restaurant/${id}/photo/${i}`,
}));

jest.mock("../brand/LogoMarkSVG", () => ({
  __esModule: true,
  default: () => <svg data-testid="logo-mark" />,
}));

jest.mock("../mockFriends", () => ({
  __esModule: true,
  mockFriendsFor: () => ({ names: [], extra: 0 }),
}));

/**
 * JSDOM doesn't do real image loading, so patch `new Image()` to give
 * tests deterministic control over onload/onerror timing.
 */
class FakeImage {
  constructor() { this.onload = null; this.onerror = null; }
  set src(url) {
    this._src = url;
    FakeImage.instances.push(this);
  }
  get src() { return this._src; }
}
FakeImage.instances = [];
FakeImage.loadAll = () => FakeImage.instances.forEach((i) => i.onload && i.onload());
FakeImage.errorAll = () => FakeImage.instances.forEach((i) => i.onerror && i.onerror());
FakeImage.reset = () => { FakeImage.instances = []; };

beforeAll(() => { global.Image = FakeImage; });
beforeEach(() => { FakeImage.reset(); });

import RestaurantCard from "../RestaurantCard";

function makeRestaurant(overrides = {}) {
  return {
    id: 42,
    name: "Test Restaurant",
    category: "Italian",
    address: "123 Main St, Brooklyn, NY 11211, USA",
    photo_count: 0,
    ...overrides,
  };
}

describe("RestaurantCard photo fallback", () => {
  beforeEach(() => {
    // Freeze the clock so open/closed pill renders deterministically
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-14T15:00:00")); // Tue 3pm
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it("renders the logo fallback when photo_count is 0", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ photo_count: 0 })} />);
    expect(document.querySelector(".cwm-card-photo-fallback [data-testid='logo-mark']")).toBeTruthy();
    expect(document.querySelector("img.cwm-card-photo-img")).toBeNull();
  });

  it("does NOT render the <img> until the preload onload fires (no fallback flash)", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ photo_count: 3 })} />);
    // Before preload resolves — fallback logo is visible, no <img> yet
    expect(document.querySelector(".cwm-card-photo-fallback [data-testid='logo-mark']")).toBeTruthy();
    expect(document.querySelector("img.cwm-card-photo-img")).toBeNull();
    // Simulate the browser finishing the preload
    act(() => { FakeImage.loadAll(); });
    const img = document.querySelector("img.cwm-card-photo-img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toContain("/api/restaurant/42/photo/0");
  });

  it("marks photoIdx as failed when preload errors, never renders <img>", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ photo_count: 1 })} />);
    act(() => { FakeImage.errorAll(); });
    // Only 1 photo and it failed → never commits a src → no <img>
    expect(document.querySelector("img.cwm-card-photo-img")).toBeNull();
    expect(document.querySelector(".cwm-card-photo-fallback [data-testid='logo-mark']")).toBeTruthy();
  });

  it("resets preload state when the restaurant changes", () => {
    const { rerender } = render(<RestaurantCard restaurant={makeRestaurant({ id: 1, photo_count: 5 })} />);
    act(() => { FakeImage.loadAll(); });
    let img = document.querySelector("img.cwm-card-photo-img");
    expect(img.getAttribute("src")).toContain("/api/restaurant/1/photo/0");
    // Swap restaurants — src resets to null while the new preload runs
    FakeImage.reset();
    rerender(<RestaurantCard restaurant={makeRestaurant({ id: 2, photo_count: 2 })} />);
    expect(document.querySelector("img.cwm-card-photo-img")).toBeNull();
    act(() => { FakeImage.loadAll(); });
    img = document.querySelector("img.cwm-card-photo-img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toContain("/api/restaurant/2/photo/0");
  });

  it("renders photo dots only when focused + photo_count > 1", () => {
    // Not focused → no dots
    const { rerender } = render(
      <RestaurantCard restaurant={makeRestaurant({ photo_count: 3 })} isFocused={false} />
    );
    expect(document.querySelectorAll(".cwm-photo-dot")).toHaveLength(0);
    // Focused + multi-photo → dot count matches photo_count
    rerender(
      <RestaurantCard restaurant={makeRestaurant({ photo_count: 3 })} isFocused={true} />
    );
    expect(document.querySelectorAll(".cwm-photo-dot")).toHaveLength(3);
    // Focused but single photo → still no dots
    rerender(
      <RestaurantCard restaurant={makeRestaurant({ photo_count: 1 })} isFocused={true} />
    );
    expect(document.querySelectorAll(".cwm-photo-dot")).toHaveLength(0);
  });

  it("clicking a photo dot jumps to that photo index and pauses rotation", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ photo_count: 4 })} isFocused={true} />);
    act(() => { FakeImage.loadAll(); });
    const dots = document.querySelectorAll(".cwm-photo-dot");
    expect(dots).toHaveLength(4);
    expect(dots[0].className).toContain("is-active");
    act(() => { fireEvent.click(dots[2]); });
    act(() => { FakeImage.loadAll(); });
    const activeDot = document.querySelector(".cwm-photo-dot.is-active");
    expect(Array.from(document.querySelectorAll(".cwm-photo-dot")).indexOf(activeDot)).toBe(2);
    const img = document.querySelector("img.cwm-card-photo-img");
    expect(img.getAttribute("src")).toContain("/photo/2");
  });
});

describe("RestaurantCard hours + status", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-14T15:00:00")); // Tuesday 3pm
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  const hoursJson = JSON.stringify([
    "Sunday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
    "Monday: Closed",
    "Tuesday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
    "Wednesday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
    "Thursday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
    "Friday: 11:00\u202fAM\u2009\u2013\u200911:00\u202fPM",
    "Saturday: 10:00\u202fAM\u2009\u2013\u200911:00\u202fPM",
  ]);

  it("shows Open Now pill during business hours", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ hours_json: hoursJson })} />);
    const pill = document.querySelector(".cwm-status-pill");
    expect(pill).toBeTruthy();
    expect(pill.className).toContain("is-open");
    expect(pill.textContent).toMatch(/Open Now/);
  });

  it("shows today's hours line", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ hours_json: hoursJson })} />);
    const hoursLine = document.querySelector(".cwm-card-hours");
    expect(hoursLine).toBeTruthy();
    expect(hoursLine.textContent).toMatch(/Today\s·\s11:00 AM.+7:00 PM/);
  });

  it("hides both pill and hours line when hours_json is missing", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ hours_json: null })} />);
    expect(document.querySelector(".cwm-status-pill")).toBeNull();
    expect(document.querySelector(".cwm-card-hours")).toBeNull();
  });
});

describe("RestaurantCard action buttons", () => {
  it("disables Directions when address is missing", () => {
    render(<RestaurantCard restaurant={makeRestaurant({ address: null })} />);
    const dir = screen.getByLabelText(/Get directions/i);
    expect(dir.disabled).toBe(true);
  });

  it("disables Website when website is missing", () => {
    render(<RestaurantCard restaurant={makeRestaurant()} />);
    const web = screen.getByLabelText(/Open website/i);
    expect(web.disabled).toBe(true);
  });

  it("enables Directions + Website when data is present", () => {
    const r = makeRestaurant({
      website: "https://example.com",
      google_website: null,
    });
    render(<RestaurantCard restaurant={r} />);
    expect(screen.getByLabelText(/Get directions/i).disabled).toBe(false);
    expect(screen.getByLabelText(/Open website/i).disabled).toBe(false);
  });

  it("always enables Share", () => {
    render(<RestaurantCard restaurant={makeRestaurant()} />);
    expect(screen.getByLabelText(/^Share$/i).disabled).toBe(false);
  });
});
