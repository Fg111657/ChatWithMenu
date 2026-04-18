import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DietaryDrawer from "./DietaryDrawer";
import { classForGroup, groupForTag } from "./taxonomy";

/**
 * The top filter strip for the discovery module.
 *
 * Layout (after the April 2026 polish pass):
 *
 *  Row 1: [🔎 Search … ⌘K]   [📍 City]   [List | Map]
 *  Row 2: [Cuisine] │ [Type pills] │ [Dietary (N)]   [active tags]   [↕ Sort]  [12 of 205]
 *
 * Issues this revision fixes (tracked from the user's filter-bar bug list):
 *  - "Loved by Friends" pill was clipping mid-word because the type-pills
 *    row scrolled but had no scroll-snap and no fade mask → the clip looked
 *    like a rendering bug.
 *  - Cuisine and type pills ran together; we now use a dedicated
 *    `.cwm-axis-sep` vertical rule that's visually louder than the
 *    generic `.cwm-filter-divider`.
 *  - "205 spots" was a regression; standardized to "N of M restaurants".
 *  - No ⌘K hint on the search input → added, and the keystroke focuses
 *    the input globally.
 *  - Sort label wasn't discoverable; prepended a ↕ glyph.
 *  - Dietary button didn't feel heavier than the adjacent Cuisine select;
 *    bumped font-weight to 900 and confirmed the count badge still shows
 *    when activeTags.size > 0.
 *  - City display + List/Map toggle from the prototype were missing —
 *    restored as props with sensible defaults so the parent can wire them
 *    when it's ready without breaking existing callers.
 */

const TYPE_PILLS = [
  "All", "Restaurants", "Bars & Drinks", "Cafes & Treats",
  "Loved by Friends", "Liked", "Disliked",
];

const SORT_OPTIONS = ["Best Match", "Rating", "Most Reviewed", "Distance"];

export default function DietaryFilterBar({
  search, onSearchChange,
  cuisine, cuisines, onCuisineChange,
  type, onTypeChange,
  sort, onSortChange,
  activeTags, onToggleTag, onClearTags,
  resultCount,
  totalCount,
  city = "New York City, NY",
  view = "list",
  onViewChange,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dietaryBtnRef = useRef(null);
  const searchInputRef = useRef(null);

  const activeTagList = useMemo(() => Array.from(activeTags), [activeTags]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ⌘K / Ctrl+K — focus the search input from anywhere on the page.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // If parent didn't pass totalCount (older callers), fall back to showing
  // just the filtered count so we never render "undefined of 12".
  const hasTotal = typeof totalCount === "number";
  const countLabel = hasTotal
    ? `${resultCount} of ${totalCount} restaurants`
    : `${resultCount} ${resultCount === 1 ? "restaurant" : "restaurants"}`;

  return (
    <div className="cwm-filter-bar">
      {/* ── Row 1 ── */}
      <div className="cwm-filter-row">
        <div className="cwm-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search restaurants…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search restaurants"
          />
          <span className="cwm-kbd" aria-hidden="true">⌘K</span>
        </div>

        <div className="cwm-city-pill" aria-label={`Browsing ${city}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{city}</span>
        </div>

        <div className="cwm-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`cwm-view-btn${view === "list" ? " is-active" : ""}`}
            aria-pressed={view === "list"}
            onClick={() => onViewChange && onViewChange("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`cwm-view-btn${view === "map" ? " is-active" : ""}`}
            aria-pressed={view === "map"}
            onClick={() => onViewChange && onViewChange("map")}
          >
            Map
          </button>
        </div>
      </div>

      {/* ── Row 2 ── */}
      <div className="cwm-filter-row cwm-filter-row-2">
        <select
          className="cwm-filter-select"
          value={cuisine}
          onChange={(e) => onCuisineChange(e.target.value)}
          aria-label="Filter by cuisine"
        >
          <option value="All">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <span className="cwm-axis-sep" aria-hidden="true" />

        <div className="cwm-type-pills" role="tablist">
          {TYPE_PILLS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === type}
              className={`cwm-type-pill${t === type ? " is-active" : ""}`}
              onClick={() => onTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="cwm-axis-sep" aria-hidden="true" />

        <button
          type="button"
          ref={dietaryBtnRef}
          className="cwm-dietary-btn"
          onClick={openDrawer}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Dietary
          {activeTags.size > 0 && (
            <span className="cwm-dietary-badge">{activeTags.size}</span>
          )}
        </button>

        {activeTagList.length > 0 && (
          <div className="cwm-active-tags" role="list">
            {activeTagList.map((tag) => {
              const cls = classForGroup(groupForTag(tag));
              return (
                <button
                  key={tag}
                  role="listitem"
                  type="button"
                  className={`cwm-active-tag ${cls}`}
                  onClick={() => onToggleTag(tag)}
                  aria-label={`Remove filter ${tag}`}
                >
                  {tag} <span aria-hidden="true">×</span>
                </button>
              );
            })}
            <button
              type="button"
              className="cwm-active-tags-clear"
              onClick={onClearTags}
            >
              Clear
            </button>
          </div>
        )}

        <div className="cwm-filter-right">
          <div className="cwm-sort-wrap">
            <span className="cwm-sort-icon" aria-hidden="true">↕</span>
            <span className="cwm-sort-label" aria-hidden="true">Sort:</span>
            <select
              className="cwm-filter-select cwm-sort-select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort restaurants"
            >
              {SORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <span className="cwm-result-count">{countLabel}</span>
        </div>
      </div>

      {drawerOpen && (
        <DietaryDrawer
          anchor={dietaryBtnRef}
          activeTags={activeTags}
          onToggleTag={onToggleTag}
          onClearTags={onClearTags}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
