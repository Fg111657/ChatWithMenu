import { useCallback, useEffect, useRef, useState } from "react";
import discoveryApi from "../../services/discoveryApi";

const LS_KEY = "cwm.discovery.v1";

/**
 * Persistence model:
 *
 *   1. Every action (save / skip) updates local state immediately →
 *      the UI never blocks on the network.
 *   2. The same action fires an API call in the background. If it fails,
 *      local state stays; the next login reconciles via mergeLocalIntoBackend.
 *   3. When a userId arrives (login), we pull the server truth and merge
 *      with local so cross-device state is honored. Server state wins when
 *      a restaurant is in both (the user already swiped on that device).
 *   4. Anonymous users just use localStorage until they authenticate.
 *
 * Shape of stored state:
 *   { saved: number[], skipped: number[] }
 */

function _loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { saved: [], skipped: [] };
    const data = JSON.parse(raw);
    return {
      saved: Array.isArray(data.saved) ? data.saved : [],
      skipped: Array.isArray(data.skipped) ? data.skipped : [],
    };
  } catch {
    return { saved: [], skipped: [] };
  }
}

function _persistLocal(state) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        saved: Array.from(state.saved),
        skipped: Array.from(state.skipped),
      })
    );
  } catch { /* quota / privacy mode — ignore */ }
}

export default function useDiscoveryStore(userId) {
  const initial = _loadLocal();
  const [saved, setSaved] = useState(() => new Set(initial.saved));
  const [skipped, setSkipped] = useState(() => new Set(initial.skipped));

  // Persist to localStorage on every change (cheap + atomic for small sets)
  useEffect(() => {
    _persistLocal({ saved, skipped });
  }, [saved, skipped]);

  // On login, pull server state + merge local up. Runs once per userId.
  const didMergeFor = useRef(null);
  useEffect(() => {
    if (!userId || didMergeFor.current === userId) return;
    didMergeFor.current = userId;
    (async () => {
      try {
        // Push local state to backend first so anything the user did
        // while logged out is promoted to their account.
        const localSnapshot = _loadLocal();
        if (localSnapshot.saved.length || localSnapshot.skipped.length) {
          await discoveryApi.mergeLocalIntoBackend(userId, localSnapshot);
        }
        // Then read the full (now-merged) state back.
        const server = await discoveryApi.loadDiscoveryState(userId);
        setSaved(new Set(server.saved || []));
        setSkipped(new Set(server.skipped || []));
      } catch (e) {
        // Don't crash — the user still has their local state.
        console.warn("[discovery] backend sync failed:", e.message);
      }
    })();
  }, [userId]);

  /** Save a restaurant. Optimistic; server call is fire-and-forget. */
  const save = useCallback((restaurantId) => {
    const rid = Number(restaurantId);
    setSaved((prev) => {
      const next = new Set(prev);
      next.add(rid);
      return next;
    });
    // Right-swipe implicitly clears a prior skip.
    setSkipped((prev) => {
      if (!prev.has(rid)) return prev;
      const next = new Set(prev);
      next.delete(rid);
      return next;
    });
    if (userId) {
      discoveryApi.saveRestaurant(userId, rid).catch((e) => console.warn(e.message));
    }
  }, [userId]);

  /** Unsave — undo path for heart toggle + future "remove from saved" flow. */
  const unsave = useCallback((restaurantId) => {
    const rid = Number(restaurantId);
    setSaved((prev) => {
      if (!prev.has(rid)) return prev;
      const next = new Set(prev);
      next.delete(rid);
      return next;
    });
    if (userId) {
      discoveryApi.unsaveRestaurant(userId, rid).catch((e) => console.warn(e.message));
    }
  }, [userId]);

  const skip = useCallback((restaurantId) => {
    const rid = Number(restaurantId);
    setSkipped((prev) => {
      const next = new Set(prev);
      next.add(rid);
      return next;
    });
    setSaved((prev) => {
      if (!prev.has(rid)) return prev;
      const next = new Set(prev);
      next.delete(rid);
      return next;
    });
    if (userId) {
      discoveryApi.skipRestaurant(userId, rid).catch((e) => console.warn(e.message));
    }
  }, [userId]);

  const unskip = useCallback((restaurantId) => {
    const rid = Number(restaurantId);
    setSkipped((prev) => {
      if (!prev.has(rid)) return prev;
      const next = new Set(prev);
      next.delete(rid);
      return next;
    });
    if (userId) {
      discoveryApi.unskipRestaurant(userId, rid).catch((e) => console.warn(e.message));
    }
  }, [userId]);

  return {
    saved,
    skipped,
    isSaved: (id) => saved.has(Number(id)),
    isSkipped: (id) => skipped.has(Number(id)),
    save,
    unsave,
    skip,
    unskip,
    toggleSaved: (id) => (saved.has(Number(id)) ? unsave(id) : save(id)),
  };
}
