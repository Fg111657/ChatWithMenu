import React, { useEffect, useMemo, useState } from "react";
import { restaurantPhotoUrl } from "../../services/discoveryApi";
import { cleanTagLabel, classifyTagSemantic } from "./taxonomy";
import { mockFriendsFor } from "./mockFriends";
import { formatTodayHours, isOpenNow } from "./hoursUtil";
import LogoMarkSVG from "./brand/LogoMarkSVG";

/**
 * Normalize the variety of dietary-tag shapes we see from the backend
 * into a clean display list. Drops the lowercase-hyphen import slugs
 * ("facebook-allergy-community-import", "reported-peanut") so the card
 * only ever shows human-readable labels.
 */
function collectTags(r) {
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const clean = cleanTagLabel(raw);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  };

  // Prefer the already-processed card_tags when present
  for (const cand of [r.card_tags, r.dietary_display_tags, r.dietary_tags, r.item_tags, r.tags]) {
    if (!cand) continue;
    try {
      const arr = typeof cand === "string" ? JSON.parse(cand) : cand;
      if (Array.isArray(arr)) arr.forEach(add);
    } catch {
      if (typeof cand === "string") add(cand);
    }
  }
  return out;
}

function formatStars(rating) {
  if (!rating) return "";
  const r = Math.round(rating * 2) / 2;
  const full = Math.floor(r);
  const half = r % 1 !== 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

/**
 * Try to surface a chain / brand name. Production rows don't have a
 * dedicated `chain` field, so we look for explicit fields first and
 * fall back to null (meta line will just show the category).
 */
function chainName(r) {
  return r.chain || r.brand || null;
}

/**
 * Location line — "City, State" format. Google addresses come back as
 *   "123 Main St, Brooklyn, NY 11211, USA"
 * so we split, drop the street and the country, take the city from the
 * 3rd-from-last part, and lift the 2-letter state code out of the
 * "NY 11211" 2nd-from-last part. If the row has explicit city/state
 * fields we prefer those; if we can't parse anything we gracefully fall
 * back to whatever single field is available.
 */
function locationLine(r) {
  const explicitCity = r.city || null;
  const explicitState = r.state || r.region || null;
  if (explicitCity && explicitState) return `${explicitCity}, ${explicitState}`;

  if (r.address) {
    const parts = r.address.split(",").map((p) => p.trim()).filter(Boolean);
    // Strip trailing "USA" / "United States" so parts[-2] is the state+zip
    if (parts.length && /^(usa|united states)$/i.test(parts[parts.length - 1])) {
      parts.pop();
    }
    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      const stateZip = parts[parts.length - 1] || "";
      const stateMatch = stateZip.match(/^([A-Za-z]{2,})/);
      const state = stateMatch ? stateMatch[1].toUpperCase() : "";
      if (city && state) return `${city}, ${state}`;
      if (city) return city;
    }
    if (parts.length === 1) return parts[0];
  }
  if (explicitCity) return explicitCity;
  return "";
}

/**
 * Main discovery card.
 *
 * Props:
 *   - restaurant     : backend row object
 *   - isFocused      : center card — enables photo rotation, pills are clickable
 *   - saved          : bool
 *   - onToggleSave   : () => void
 *   - onChat, onShare
 *   - onTagClick     : (tag) => void   (center card only)
 *   - activeTagSet   : Set<string>     (pills with active border)
 *   - wrapInTilt     : bool — wrap body in .cwm-tilt-inner so swipe-left/right
 *                     classes on the outer card can animate tilt independently
 *                     of the scale ladder on the slot wrapper.
 */
export default function RestaurantCard({
  restaurant,
  isFocused = false,
  saved = false,
  onToggleSave,
  onChat,
  onTagClick,
  onShare,
  activeTagSet,
  wrapInTilt = false,
  /* "left" | "right" | null — added to the outer .cwm-card element so
     the hover-zone tilt + glow animate via CSS. */
  swipeZone = null,
}) {
  const tags = useMemo(() => collectTags(restaurant), [restaurant]);
  const photoCount = restaurant.photo_count || 0;
  const [photoIdx, setPhotoIdx] = useState(0);
  /**
   * committedSrc is the URL the <img> is actually displaying right now.
   * We only advance it AFTER the next image has loaded in the browser
   * cache (via a hidden Image() preload). That's what kills the
   * "blue fallback flash" — the <img> never has to blank out while
   * waiting for a network response.
   */
  const [committedSrc, setCommittedSrc] = useState(null);
  /**
   * Track per-index failures. If Google's /photo/<i> proxy 4xx/5xx's
   * (expired reference, rate-limited), we mark that idx and skip to
   * the next good one so the rotation doesn't stall on a dead photo.
   */
  const [failedPhotoIdx, setFailedPhotoIdx] = useState(() => new Set());
  /**
   * When the user clicks a dot, we pause the auto-rotation for a few
   * seconds so their choice sticks instead of being stomped by the
   * next tick.
   */
  const [pausedUntil, setPausedUntil] = useState(0);

  // Reset photo state when the card swaps to a new restaurant
  useEffect(() => {
    setPhotoIdx(0);
    setFailedPhotoIdx(new Set());
    setCommittedSrc(null);
    setPausedUntil(0);
  }, [restaurant.id]);

  // Auto-rotate photos every 3s on the focused card (unless paused)
  useEffect(() => {
    if (!isFocused || photoCount <= 1) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setPhotoIdx((i) => (i + 1) % photoCount);
    }, 3000);
    return () => clearInterval(t);
  }, [isFocused, photoCount, pausedUntil]);

  // If the currently-targeted photo index is failed, skip forward to
  // the next one that isn't. Prevents a dead-end where the UI is stuck
  // on a 404-ing URL.
  useEffect(() => {
    if (photoCount === 0) return;
    if (!failedPhotoIdx.has(photoIdx)) return;
    for (let i = 1; i <= photoCount; i++) {
      const candidate = (photoIdx + i) % photoCount;
      if (!failedPhotoIdx.has(candidate)) {
        setPhotoIdx(candidate);
        return;
      }
    }
  }, [photoIdx, photoCount, failedPhotoIdx]);

  // Preload + commit whenever photoIdx (or the restaurant) changes.
  // The <img> displayed on screen keeps its current src until the new
  // one is ready — smooth swap, no fallback flash.
  useEffect(() => {
    if (photoCount === 0 || failedPhotoIdx.has(photoIdx)) return;
    const nextUrl = restaurantPhotoUrl(restaurant.id, photoIdx);
    // If we already committed this URL (first mount for this card), skip.
    if (nextUrl === committedSrc) return;
    let cancelled = false;
    const loader = new Image();
    loader.onload = () => {
      if (!cancelled) setCommittedSrc(nextUrl);
    };
    loader.onerror = () => {
      if (cancelled) return;
      setFailedPhotoIdx((prev) => {
        if (prev.has(photoIdx)) return prev;
        const next = new Set(prev);
        next.add(photoIdx);
        return next;
      });
    };
    loader.src = nextUrl;
    return () => { cancelled = true; };
  }, [photoIdx, photoCount, restaurant.id, failedPhotoIdx, committedSrc]);

  const friends = mockFriendsFor(restaurant.id);

  // Click handler for photo dots — jumps to a given index and pauses
  // auto-rotation for 8s so it doesn't immediately flip away.
  const selectPhoto = (i) => {
    if (i === photoIdx) return;
    setPhotoIdx(i);
    setPausedUntil(Date.now() + 8000);
  };

  // FIX #7 — cap at 3 visible, "+N more" overflow chip
  const MAX_PILLS = 3;
  const visibleTags = tags.slice(0, MAX_PILLS);
  const extraCount = Math.max(0, tags.length - MAX_PILLS);

  const rating = restaurant.display_rating ?? restaurant.rating_aggregate;
  const reviewCount = restaurant.display_review_count ?? restaurant.review_count ?? 0;
  const chain = chainName(restaurant);
  const category = (restaurant.category || restaurant.cuisine_type || "").trim();

  // Hours — parse Google's hours_json into today's range + open/closed status
  const todayHours = formatTodayHours(restaurant.hours_json);
  const openStatus = isOpenNow(restaurant.hours_json);

  // Directions + Website URLs, gated on real data being present
  const directionsUrl = restaurant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + " " + restaurant.address)}`
    : null;
  const websiteUrl = restaurant.website || restaurant.google_website || null;

  const openDirections = () => {
    if (directionsUrl) window.open(directionsUrl, "_blank", "noopener,noreferrer");
  };
  const openWebsite = () => {
    if (websiteUrl) window.open(websiteUrl, "_blank", "noopener,noreferrer");
  };

  const body = (
    <>
      <div className="cwm-card-photo">
        {/* Fallback always mounted behind the image. When the image is
            absent or fails to load, this is what the user sees — a
            gradient + logo mark, never a bare blue square. */}
        <div className="cwm-card-photo-fallback">
          <LogoMarkSVG size={56} fill="#ffffff" />
        </div>
        {/* Single persistent <img>. Its src never changes to a URL that
            isn't already cached — so swaps are instant + silent. */}
        {committedSrc ? (
          <img
            src={committedSrc}
            alt={restaurant.name}
            className="cwm-card-photo-img"
            onError={() =>
              setFailedPhotoIdx((prev) => {
                if (prev.has(photoIdx)) return prev;
                const next = new Set(prev);
                next.add(photoIdx);
                return next;
              })
            }
          />
        ) : null}

        {/* Photo dots — only when there's more than one photo and the
            card is the focused one (the only time rotation happens). */}
        {isFocused && photoCount > 1 && (
          <div className="cwm-photo-dots" role="tablist" aria-label="Photo navigation">
            {Array.from({ length: photoCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`cwm-photo-dot${i === photoIdx ? " is-active" : ""}`}
                data-failed={failedPhotoIdx.has(i) ? "true" : "false"}
                onClick={(e) => { e.stopPropagation(); selectPhoto(i); }}
                aria-label={`Show photo ${i + 1} of ${photoCount}`}
                aria-selected={i === photoIdx}
                role="tab"
              />
            ))}
          </div>
        )}

        <button
          type="button"
          className="cwm-heart"
          data-saved={saved ? "true" : "false"}
          aria-pressed={saved}
          aria-label={saved ? "Unsave restaurant" : "Save restaurant"}
          onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(); }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={saved ? "currentColor" : "none"}
            />
          </svg>
        </button>

        {/* Open / Closed status — top-left of image, visible at a glance */}
        {openStatus !== null && (
          <span
            className={`cwm-status-pill ${openStatus ? "is-open" : "is-closed"}`}
            aria-label={openStatus ? "Open now" : "Closed now"}
          >
            <span className="cwm-status-dot" aria-hidden="true" />
            {openStatus ? "Open Now" : "Closed Now"}
          </span>
        )}
      </div>

      <div className="cwm-card-body">
        <div className="cwm-card-friends-slot">
          {friends.names.length > 0 ? (
            <span className="cwm-card-friends">
              {friends.names.slice(0, 2).join(", ")}
              {friends.extra > 0 ? ` +${friends.extra} friends` : ""} liked this
            </span>
          ) : null}
        </div>

        {/* FIX #10 — meta: CATEGORY · <a.cwm-chain>CHAIN</a> */}
        <div className="cwm-card-meta">
          {category ? <span>{category.toUpperCase()}</span> : null}
          {category && chain ? " · " : null}
          {chain ? (
            <a className="cwm-chain" href="#" onClick={(e) => e.preventDefault()}>
              {chain}
            </a>
          ) : null}
        </div>

        <div className="cwm-card-name">{restaurant.name}</div>

        {locationLine(restaurant) && (
          <div className="cwm-card-locline">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {locationLine(restaurant)}
          </div>
        )}

        {rating ? (
          <div className="cwm-card-rating">
            <span className="cwm-card-rating-stars">{formatStars(rating)}</span>
            <strong>{Number(rating).toFixed(1)}</strong>
            <span className="cwm-card-rating-count">({reviewCount})</span>
          </div>
        ) : null}

        {todayHours && (
          <div className="cwm-card-hours">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Today · {todayHours}</span>
          </div>
        )}

        {visibleTags.length > 0 && (
          <div className="cwm-card-pills">
            {visibleTags.map((tag) => {
              // FIX #7 — semantic classification (red / amber / green)
              const sem = classifyTagSemantic(tag);
              const active = activeTagSet?.has(tag);
              const interactive = Boolean(onTagClick && isFocused);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`cwm-mini cwm-mini-${sem}`}
                  data-clickable={interactive ? "true" : "false"}
                  data-active={active ? "true" : "false"}
                  onClick={
                    interactive
                      ? (e) => { e.stopPropagation(); onTagClick(tag); }
                      : undefined
                  }
                  tabIndex={interactive ? 0 : -1}
                  disabled={!interactive}
                  aria-label={active ? `Remove filter ${tag}` : `Filter by ${tag}`}
                >
                  {tag}
                </button>
              );
            })}
            {extraCount > 0 && (
              <span className="cwm-pill-more">+{extraCount} more</span>
            )}
          </div>
        )}

        {/* Primary CTA — full-width, uniform across cards */}
        <button
          type="button"
          className="cwm-btn-primary cwm-card-cta"
          onClick={(e) => { e.stopPropagation(); onChat && onChat(); }}
        >
          <span className="cwm-cta-mark">
            <LogoMarkSVG size={18} fill="#ffffff" />
          </span>
          <span>Chat With Menu</span>
        </button>

        {/* Secondary actions — fixed 3-slot row, icons auto-hide when data missing */}
        <div className="cwm-card-actions">
          <button
            type="button"
            className="cwm-card-action"
            onClick={(e) => { e.stopPropagation(); openDirections(); }}
            disabled={!directionsUrl}
            aria-label="Get directions"
            title="Get directions"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Directions</span>
          </button>
          <button
            type="button"
            className="cwm-card-action"
            onClick={(e) => { e.stopPropagation(); openWebsite(); }}
            disabled={!websiteUrl}
            aria-label="Open website"
            title="Open website"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span>Website</span>
          </button>
          <button
            type="button"
            className="cwm-card-action"
            onClick={(e) => { e.stopPropagation(); onShare && onShare(); }}
            aria-label="Share"
            title="Share"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>
    </>
  );

  const cardClass = [
    "cwm-card",
    swipeZone === "left" ? "swipe-left" : "",
    swipeZone === "right" ? "swipe-right" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={cardClass} data-saved={saved ? "true" : "false"}>
      {wrapInTilt ? <div className="cwm-tilt-inner">{body}</div> : body}
      {wrapInTilt && (
        <>
          <div className="cwm-tilt-badge skip">👎 Skip</div>
          <div className="cwm-tilt-badge like">👍 Save</div>
        </>
      )}
    </article>
  );
}
