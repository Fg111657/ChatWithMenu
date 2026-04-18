import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import RestaurantCard from "./RestaurantCard";

/**
 * SwipeDeck — Tinder-style carousel with glow + tilt.
 *
 * Queue / idx rules (the ones the earlier version got wrong):
 *
 *   LIKE   → store.save(id); advance idx by 1. The item stays in
 *            `visible`, so advance is what moves to the next card.
 *   SKIP   → store.skip(id); DO NOT advance idx. Skipping removes the
 *            item from `visible` (because we filter by isSkipped), so
 *            the "next" restaurant naturally slides into the current
 *            slot. Advancing ON TOP of the filter would double-skip
 *            items — the classic off-by-one that made the deck look
 *            frozen after one action.
 *   CLAMP  → if the skip empties the queue past idx (you were on the
 *            last card), idx snaps to the last valid index via a
 *            useEffect so we never render `visible[undefined]`.
 *   GUARD  → an `isCommitting` ref prevents a drag-end's synthetic
 *            click from firing a second commit.
 *
 * We intentionally do NOT wrap the center card in <AnimatePresence>.
 * Remounting the motion.div mid-drag kills framer's internal drag
 * state and the second swipe goes dead. A single persistent motion.div
 * whose content swaps in-place keeps drag fluid.
 */

const SWIPE_COMMIT_PX = 100;
const SWIPE_COMMIT_VX = 600;
const COMMIT_LOCK_MS  = 60;

export default function SwipeDeck({
  restaurants,
  store,
  onChat,
  activeTagSet,
  onTagClick,
  hideSkipped = true,
}) {
  // Skipped cards drop out of the upcoming queue. Saved cards stay.
  // Depend on `store.skipped` (the Set reference) directly so the memo
  // recomputes whenever the skipped set is replaced by a state update —
  // depending on `store` alone is flaky because the store object's
  // reference is not guaranteed to change when only the Set changes.
  const visible = useMemo(() => {
    if (!hideSkipped) return restaurants;
    return restaurants.filter((r) => !store.isSkipped(r.id));
  }, [restaurants, store, store.skipped, hideSkipped]);

  const [idx, setIdx] = useState(0);
  const [zone, setZone] = useState(null); // "left" | "right" | null
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  // Guard against double-commit from drag-end + synthetic click
  const isCommitting = useRef(false);

  const centerRef = useRef(null);
  const stageRef = useRef(null);
  const dragX = useMotionValue(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Clamp idx whenever visible shrinks below it. This is what handles
  // "user skipped the last card" — we clamp to the new last index
  // instead of rendering an undefined card.
  useEffect(() => {
    if (visible.length === 0) return;
    if (idx >= visible.length) {
      setIdx(Math.max(0, visible.length - 1));
    }
  }, [visible.length, idx]);

  // Advance / retreat using functional updates so we always act on the
  // latest idx value even if multiple state updates are batched.
  const advance = useCallback(() => {
    setIdx((i) => {
      const n = visible.length;
      return n ? (i + 1) % n : 0;
    });
  }, [visible.length]);

  const retreat = useCallback(() => {
    setIdx((i) => {
      const n = visible.length;
      return n ? (i - 1 + n) % n : 0;
    });
  }, [visible.length]);

  const commitLike = useCallback(() => {
    if (isCommitting.current) return;
    const r = visible[idx];
    if (!r) return;
    isCommitting.current = true;
    store.save(r.id);
    setZone(null);
    dragX.set(0);
    advance();
    setTimeout(() => { isCommitting.current = false; }, COMMIT_LOCK_MS);
  }, [visible, idx, store, advance, dragX]);

  const commitSkip = useCallback(() => {
    if (isCommitting.current) return;
    const r = visible[idx];
    if (!r) return;
    isCommitting.current = true;
    store.skip(r.id);
    setZone(null);
    dragX.set(0);
    // DO NOT advance: the filter will remove `r` from visible, and the
    // next restaurant naturally slides into this same idx slot.
    setTimeout(() => { isCommitting.current = false; }, COMMIT_LOCK_MS);
  }, [visible, idx, store, dragX]);

  // Mouse-driven hover zone on the center card
  const onCenterMouseMove = useCallback((e) => {
    if (!centerRef.current) return;
    const r = centerRef.current.getBoundingClientRect();
    const pct = (e.clientX - r.left) / r.width;
    if (pct < 0.4) setZone("left");
    else if (pct > 0.6) setZone("right");
    else setZone(null);
  }, []);
  const onCenterMouseLeave = useCallback(() => setZone(null), []);

  // Click-on-zone commits
  const onCenterClick = useCallback((e) => {
    if (e.target.closest("button,a,input,textarea,select")) return;
    if (zone === "left") commitSkip();
    else if (zone === "right") commitLike();
  }, [zone, commitSkip, commitLike]);

  // Keyboard ← / → — light up the glow, then commit
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setZone("right");
        setTimeout(() => commitLike(), 150);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setZone("left");
        setTimeout(() => commitSkip(), 150);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitLike, commitSkip]);

  // Mouse-wheel navigation over the whole capsule. Attached natively
  // with { passive: false } so we can preventDefault and stop the page
  // scroll from fighting the carousel.
  // Tuned for "fast" — low threshold + short cooldown — because the
  // user's feedback was explicitly that the previous version felt slow
  // and required too much deliberate scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let lockUntil = 0;
    let accum = 0;
    const STEP = 24;       // px of wheel delta per card change (was 40)
    const COOLDOWN = 120;  // ms between card changes    (was 250)
    const onWheel = (e) => {
      const dx = e.deltaX;
      const dy = e.deltaY;
      // Only capture HORIZONTAL intent. Vertical scroll must pass through
      // to the page — users were complaining the carousel hijacked the
      // page scroll whenever the mouse crossed the stage.
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (Math.abs(dx) < 1) return;
      e.preventDefault();
      const now = Date.now();
      if (now < lockUntil) return;
      accum += dx;
      if (Math.abs(accum) < STEP) return;
      lockUntil = now + COOLDOWN;
      if (accum > 0) advance();
      else           retreat();
      accum = 0;
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [advance, retreat]);

  // Touch drag — light up the glow in real time
  const onDrag = useCallback((_, info) => {
    const dx = info.offset.x;
    if (dx < -40) setZone("left");
    else if (dx > 40) setZone("right");
    else setZone(null);
  }, []);

  const onDragEnd = useCallback((_, info) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    if (dx > SWIPE_COMMIT_PX || vx > SWIPE_COMMIT_VX) {
      commitLike();
    } else if (dx < -SWIPE_COMMIT_PX || vx < -SWIPE_COMMIT_VX) {
      commitSkip();
    } else {
      setZone(null);
      dragX.set(0);
    }
  }, [commitLike, commitSkip, dragX]);

  if (!visible.length) {
    return (
      <div className="cwm-deck-empty">
        <h3>You've seen them all 👀</h3>
        <p>Adjust your filters or come back when new restaurants arrive.</p>
      </div>
    );
  }

  // Safe center — always pull a valid entry, even if idx is transiently
  // out-of-range between the skip action and the clamp useEffect.
  const safeIdx = Math.min(idx, visible.length - 1);
  const center = visible[safeIdx];
  const at = (off) =>
    visible[((safeIdx + off) % visible.length + visible.length) % visible.length];

  return (
    <div className="cwm-deck" role="region" aria-label="Restaurant discovery carousel">
      {/* Capsule — the hover zone for wheel navigation. Subtle glass so
          the user can see where the active area is; wheel handler lives
          here, covering the whole breadth including peek cards + gutter. */}
      <div className="cwm-deck-capsule" ref={stageRef}>
      <div className="cwm-deck-stage">
        {/* Peek slots — desktop only */}
        {!isMobile && visible.length > 1 && (
          <>
            {visible.length > 2 && (
              <div className="cwm-card-slot pos-far-left" aria-hidden="true">
                <RestaurantCard restaurant={at(-2)} isFocused={false} />
              </div>
            )}
            <div className="cwm-card-slot pos-left" aria-hidden="true">
              <RestaurantCard restaurant={at(-1)} isFocused={false} />
            </div>
            <div className="cwm-card-slot pos-right" aria-hidden="true">
              <RestaurantCard restaurant={at(1)} isFocused={false} />
            </div>
            {visible.length > 2 && (
              <div className="cwm-card-slot pos-far-right" aria-hidden="true">
                <RestaurantCard restaurant={at(2)} isFocused={false} />
              </div>
            )}
          </>
        )}

        {/* Center — persistent motion.div. NO AnimatePresence, so the
            drag node never remounts under framer-motion's feet. */}
        <motion.div
          ref={centerRef}
          className="cwm-card-slot pos-center"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          style={{ x: dragX }}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          onMouseMove={onCenterMouseMove}
          onMouseLeave={onCenterMouseLeave}
          onClick={onCenterClick}
          whileTap={{ cursor: "grabbing" }}
        >
          <RestaurantCard
            restaurant={center}
            isFocused
            saved={store.isSaved(center.id)}
            onToggleSave={() => store.toggleSaved(center.id)}
            onChat={() => onChat && onChat(center)}
            onTagClick={onTagClick}
            activeTagSet={activeTagSet}
            wrapInTilt
            swipeZone={zone}
            onShare={() => {
              const url = `${window.location.origin}/restaurant/${center.id}`;
              if (navigator.share) navigator.share({ title: center.name, url }).catch(() => {});
              else navigator.clipboard?.writeText(url).catch(() => {});
            }}
          />
        </motion.div>
      </div>
      </div>

      {/* Progress — green-bar style like the reference prototype. The
          filled width shows how far through the deck the user has
          travelled; hover reveals a tooltip with the exact count. */}
      <div className="cwm-deck-progress" aria-hidden="true">
        <div
          className="cwm-deck-progress-fill"
          style={{ width: `${((safeIdx + 1) / visible.length) * 100}%` }}
        />
      </div>

      {/* Nav row: ← Card X of Y → (no ✕, no ❤, no slash) */}
      <div className="cwm-deck-nav" role="group" aria-label="Deck navigation">
        <button
          type="button"
          className="cwm-deck-arrow"
          onClick={retreat}
          aria-label="Previous restaurant"
        >
          ←
        </button>
        <span className="cwm-deck-counter" aria-live="polite">
          Card {safeIdx + 1} of {visible.length}
        </span>
        <button
          type="button"
          className="cwm-deck-arrow"
          onClick={advance}
          aria-label="Next restaurant"
        >
          →
        </button>
      </div>
    </div>
  );
}
