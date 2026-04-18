/**
 * Behavior tests for the SwipeDeck. The critical invariants:
 *
 *   1. LIKE advances idx by 1 (current card stays in queue, saved set grows).
 *   2. SKIP does NOT advance idx on its own — the skipped item is filtered
 *      out of `visible`, so the "next" card naturally slides into the
 *      current idx slot. Advancing AND filtering would double-skip.
 *   3. When idx lands past the end of `visible`, it clamps to the last
 *      valid index so the deck never shows an undefined card.
 *   4. The action-in-flight guard prevents double-commits from a drag
 *      that also triggers a synthetic click.
 *   5. Keyboard ←/→ drive the same commit path as buttons and swipe.
 *
 * RestaurantCard is mocked to a plain <div> — this test is about the
 * deck's queue mechanics, not the card's UI.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

// Mock framer-motion so we don't have to fight animation scheduling in JSDOM.
// We keep the drag callbacks callable via test helpers.
jest.mock("framer-motion", () => {
  const React = require("react");
  // Capture latest onDrag/onDragEnd handlers so tests can simulate drag manually
  const bus = {};
  return {
    __esModule: true,
    motion: new Proxy({}, {
      get: () => React.forwardRef(({ onDrag, onDragEnd, drag, dragConstraints, dragElastic, whileTap, animate, initial, exit, transition, style, ...props }, ref) => {
        bus.onDrag = onDrag;
        bus.onDragEnd = onDragEnd;
        return React.createElement("div", { ...props, ref });
      }),
    }),
    AnimatePresence: ({ children }) => children,
    useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
    __fmBus: bus,
  };
});

jest.mock("../../../services/discoveryApi", () => ({
  __esModule: true,
  default: {
    saveRestaurant: jest.fn(),
    unsaveRestaurant: jest.fn(),
    skipRestaurant: jest.fn(),
    unskipRestaurant: jest.fn(),
    loadDiscoveryState: jest.fn().mockResolvedValue({ saved: [], skipped: [] }),
    mergeLocalIntoBackend: jest.fn(),
    restaurantPhotoUrl: (id, i) => `mock:photo/${id}/${i}`,
  },
}));

// Simplify the card so we can inspect {id, saved, swipeZone} easily.
jest.mock("../RestaurantCard", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: function MockCard({ restaurant, saved, swipeZone, isFocused }) {
      return (
        <div
          data-testid="card"
          data-id={restaurant?.id}
          data-name={restaurant?.name}
          data-saved={saved ? "true" : "false"}
          data-focused={isFocused ? "true" : "false"}
          data-zone={swipeZone || "none"}
        >
          {restaurant?.name}
        </div>
      );
    },
  };
});

import SwipeDeck from "../SwipeDeck";

/** Minimal restaurant shape the deck needs. */
function makeQueue(ids = ["a", "b", "c", "d", "e"]) {
  return ids.map((id) => ({ id, name: `R-${id}` }));
}

/**
 * Minimal store stub that behaves like useDiscoveryStore. Mutations
 * return NEW Set references so `useMemo` deps that observe
 * `store.saved` / `store.skipped` fire their recomputes, matching the
 * behavior of the real hook's `setSaved(new Set(prev))` pattern.
 */
function makeStore() {
  const store = {
    saved: new Set(),
    skipped: new Set(),
    isSaved:    (id) => store.saved.has(id),
    isSkipped:  (id) => store.skipped.has(id),
    save: (id) => {
      const nextSaved = new Set(store.saved);   nextSaved.add(id);
      const nextSkip  = new Set(store.skipped); nextSkip.delete(id);
      store.saved = nextSaved; store.skipped = nextSkip;
    },
    unsave: (id) => {
      const next = new Set(store.saved); next.delete(id); store.saved = next;
    },
    skip: (id) => {
      const nextSkip  = new Set(store.skipped); nextSkip.add(id);
      const nextSaved = new Set(store.saved);   nextSaved.delete(id);
      store.skipped = nextSkip; store.saved = nextSaved;
    },
    unskip: (id) => {
      const next = new Set(store.skipped); next.delete(id); store.skipped = next;
    },
    toggleSaved: (id) => {
      if (store.saved.has(id)) store.unsave(id); else store.save(id);
    },
  };
  return store;
}

/** Which restaurant is in the center slot right now. */
function centerId() {
  // Multiple cards render (peek + center). The focused one has data-focused.
  const focused = document.querySelector('[data-testid="card"][data-focused="true"]');
  return focused ? focused.getAttribute("data-id") : null;
}

function clickNextArrow() {
  fireEvent.click(screen.getByLabelText(/Next restaurant/i));
}
function clickPrevArrow() {
  fireEvent.click(screen.getByLabelText(/Previous restaurant/i));
}

/**
 * Keyboard commits are deliberately delayed 150ms so the glow class
 * can light up first (UX polish). Tests need to flush that timeout.
 */
function fireKey(key) {
  act(() => { fireEvent.keyDown(window, { key }); });
  act(() => { jest.advanceTimersByTime(200); });
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("SwipeDeck idx progression", () => {
  it("renders the first visible restaurant in the center on mount", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    expect(centerId()).toBe("a");
    expect(screen.getByText(/^Card 1 of 5$/)).toBeTruthy();
  });

  it("LIKE (store.save + advance) moves to the next restaurant", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    act(() => { store.save("a"); });
    // Simulate a swipe-right by firing the DeckArrow isn't quite right —
    // LIKE path is: commit through drag-end OR keyboard. We directly
    // exercise the keyboard path because it's public-API.
    fireKey("ArrowRight");
    expect(centerId()).toBe("b");
    expect(screen.getByText(/^Card 2 of 5$/)).toBeTruthy();
    expect(store.saved.has("a")).toBe(true);
  });

  it("SKIP removes the item from the queue WITHOUT over-advancing", () => {
    const store = makeStore();
    const { rerender } = render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    // Current center = "a". Skip it.
    fireKey("ArrowLeft");
    // "a" is skipped. visible becomes [b, c, d, e]. idx SHOULD stay 0 so
    // the center shows "b" — not "c" (which would be double-advance).
    rerender(<SwipeDeck restaurants={makeQueue()} store={store} />);
    expect(centerId()).toBe("b");
    expect(screen.getByText(/^Card 1 of 4$/)).toBeTruthy();
    expect(store.skipped.has("a")).toBe(true);
  });

  it("chain of LIKE-SKIP-LIKE works without freezing", () => {
    const store = makeStore();
    const queue = makeQueue();
    const { rerender } = render(<SwipeDeck restaurants={queue} store={store} />);

    // Like a → advance to b
    fireKey("ArrowRight");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    expect(centerId()).toBe("b");

    // Skip b → queue is [a,c,d,e], idx stays → c slides in
    fireKey("ArrowLeft");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    expect(centerId()).toBe("c");

    // Like c → advance to d
    fireKey("ArrowRight");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    expect(centerId()).toBe("d");

    expect(store.saved).toEqual(new Set(["a", "c"]));
    expect(store.skipped).toEqual(new Set(["b"]));
  });

  it("skipping the last card clamps idx to the new last index", () => {
    const store = makeStore();
    const queue = makeQueue(["a", "b", "c"]);
    const { rerender } = render(<SwipeDeck restaurants={queue} store={store} />);
    // Walk to the last card (c)
    fireKey("ArrowRight");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    fireKey("ArrowRight");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    expect(centerId()).toBe("c");
    // Skip c — visible becomes [a, b] but a and b are already saved.
    fireKey("ArrowLeft");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    // idx clamps; the center should still render SOMETHING (not blank)
    expect(centerId()).not.toBeNull();
  });

  it("Next / Prev arrow buttons cycle without firing like/skip", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    clickNextArrow();
    expect(centerId()).toBe("b");
    expect(store.saved.size).toBe(0);  // arrows do NOT commit
    expect(store.skipped.size).toBe(0);
    clickPrevArrow();
    expect(centerId()).toBe("a");
  });

  it("skipping all items shows the empty state, not a broken card", () => {
    const store = makeStore();
    const queue = makeQueue(["a", "b"]);
    const { rerender } = render(<SwipeDeck restaurants={queue} store={store} />);
    fireKey("ArrowLeft");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    fireKey("ArrowLeft");
    rerender(<SwipeDeck restaurants={queue} store={store} />);
    expect(screen.queryByText(/You've seen them all/i)).toBeTruthy();
  });

  it("heart (store.save toggle) on the center card persists but does NOT advance", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    expect(centerId()).toBe("a");
    act(() => { store.toggleSaved("a"); });
    expect(store.saved.has("a")).toBe(true);
    expect(centerId()).toBe("a"); // toggle does not advance
  });

  it("horizontal mouse wheel (right) advances the deck; does not commit like/skip", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    const stage = document.querySelector(".cwm-deck-stage");
    // Emit a native WheelEvent — React's synthetic wheel handlers are
    // passive, so the component attaches a native listener and receives this.
    act(() => {
      stage.dispatchEvent(new WheelEvent("wheel", { deltaX: 120, bubbles: true, cancelable: true }));
    });
    expect(centerId()).toBe("b");
    expect(store.saved.size).toBe(0);
    expect(store.skipped.size).toBe(0);
  });

  it("horizontal mouse wheel (left) retreats the deck", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    expect(centerId()).toBe("a");
    const stage = document.querySelector(".cwm-deck-stage");
    act(() => {
      stage.dispatchEvent(new WheelEvent("wheel", { deltaX: -120, bubbles: true, cancelable: true }));
    });
    // Wrap: a → e (previous of index 0 is last index)
    expect(centerId()).toBe("e");
  });

  it("vertical mouse wheel (deltaY only) does NOT navigate — lets the page scroll", () => {
    const store = makeStore();
    render(<SwipeDeck restaurants={makeQueue()} store={store} />);
    expect(centerId()).toBe("a");
    const stage = document.querySelector(".cwm-deck-stage");
    act(() => {
      stage.dispatchEvent(new WheelEvent("wheel", { deltaY: 240, bubbles: true, cancelable: true }));
      stage.dispatchEvent(new WheelEvent("wheel", { deltaY: -240, bubbles: true, cancelable: true }));
    });
    // Pure vertical scroll is ignored by the carousel.
    expect(centerId()).toBe("a");
  });
});
