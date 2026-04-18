/**
 * Tests for the save/skip store. Focus is on the pieces that the
 * SwipeDeck depends on for correct idx progression:
 *  - save/skip/unsave/unskip idempotency
 *  - skip clears a prior save, and vice versa (most-recent-swipe wins)
 *  - isSaved / isSkipped reflect the current set
 */
import { act, renderHook } from "@testing-library/react";
import useDiscoveryStore from "../useDiscoveryStore";

// Avoid the network — the store fires these for logged-in users only,
// but mocking them is safer than counting on userId=null to skip them.
jest.mock("../../../services/discoveryApi", () => ({
  __esModule: true,
  default: {
    saveRestaurant:    jest.fn().mockResolvedValue({ saved: true }),
    unsaveRestaurant:  jest.fn().mockResolvedValue({ saved: false }),
    skipRestaurant:    jest.fn().mockResolvedValue({ skipped: true }),
    unskipRestaurant:  jest.fn().mockResolvedValue({ skipped: false }),
    loadDiscoveryState:   jest.fn().mockResolvedValue({ saved: [], skipped: [] }),
    mergeLocalIntoBackend:jest.fn().mockResolvedValue({ merged_saved: 0, merged_skipped: 0 }),
    restaurantPhotoUrl: (id, i) => `mock:photo/${id}/${i}`,
  },
}));

beforeEach(() => {
  localStorage.clear();
});

describe("useDiscoveryStore", () => {
  it("save adds to saved set, isSaved reflects it", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    expect(result.current.isSaved(42)).toBe(false);
    act(() => result.current.save(42));
    expect(result.current.isSaved(42)).toBe(true);
    expect(result.current.saved.has(42)).toBe(true);
  });

  it("skip adds to skipped set, isSkipped reflects it", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    expect(result.current.isSkipped(7)).toBe(false);
    act(() => result.current.skip(7));
    expect(result.current.isSkipped(7)).toBe(true);
  });

  it("save overrides a prior skip (right-swipe wins)", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.skip(5));
    act(() => result.current.save(5));
    expect(result.current.isSaved(5)).toBe(true);
    expect(result.current.isSkipped(5)).toBe(false);
  });

  it("skip overrides a prior save (left-swipe wins)", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.save(5));
    act(() => result.current.skip(5));
    expect(result.current.isSkipped(5)).toBe(true);
    expect(result.current.isSaved(5)).toBe(false);
  });

  it("unsave + unskip remove from the respective set", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.save(1));
    act(() => result.current.skip(2));
    act(() => result.current.unsave(1));
    act(() => result.current.unskip(2));
    expect(result.current.isSaved(1)).toBe(false);
    expect(result.current.isSkipped(2)).toBe(false);
  });

  it("toggleSaved flips state", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.toggleSaved(99));
    expect(result.current.isSaved(99)).toBe(true);
    act(() => result.current.toggleSaved(99));
    expect(result.current.isSaved(99)).toBe(false);
  });

  it("save/skip are idempotent — no duplicate entries on repeat calls", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.save(3));
    act(() => result.current.save(3));
    act(() => result.current.save(3));
    expect(result.current.saved.size).toBe(1);
  });

  it("persists and restores from localStorage on next mount", () => {
    const { result, unmount } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.save(10));
    act(() => result.current.skip(20));
    unmount();

    // Remount — should pick up localStorage state
    const { result: r2 } = renderHook(() => useDiscoveryStore(null));
    expect(r2.current.isSaved(10)).toBe(true);
    expect(r2.current.isSkipped(20)).toBe(true);
  });

  it("coerces id types (string ↔ number)", () => {
    const { result } = renderHook(() => useDiscoveryStore(null));
    act(() => result.current.save("42"));
    expect(result.current.isSaved(42)).toBe(true);
    expect(result.current.isSaved("42")).toBe(true);
  });
});
