/**
 * Mock social layer — stand-in for the real user-graph we'll wire in
 * Phase 2 (My Table concept). Deterministic on restaurant id so the
 * same restaurant always shows the same "friends who liked it" and
 * never flips between renders.
 */

const NAMES = ["Sam", "Casey", "Jordan", "Drew", "Morgan", "Riley", "Quinn", "Alex"];

/** Cheap stable hash: sum char codes + id. */
function _hash(str, salt = 0) {
  let h = salt;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Returns { names: string[], extra: number } for a restaurant id.
 * About 22% of restaurants get ≥1 friend; the rest return empty.
 * (Good for testing the UI slot without making every card feel like
 * everyone likes it.)
 */
export function mockFriendsFor(restaurantId) {
  const h = _hash(restaurantId, 7);
  // ~22% hit rate
  if (h % 100 >= 22) return { names: [], extra: 0 };

  // 1..3 friend names, rotating through NAMES so the choice is stable.
  const count = (h % 3) + 1;
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(NAMES[(h + i * 3) % NAMES.length]);
  }
  const extra = (h % 5) + (count > 2 ? 2 : 0); // occasional "+N more"
  return { names, extra: extra > 0 && count >= 2 ? extra : 0 };
}
