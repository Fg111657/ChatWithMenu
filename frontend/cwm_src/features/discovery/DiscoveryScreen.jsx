import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/900.css";

import "./brand/tokens.css";
import "./RestaurantCard.css";
import "./SwipeDeck.css";
import "./DietaryFilterBar.css";
import "./DiscoveryScreen.css";

import dataService from "../../services/dataService";
import useDiscoveryStore from "./useDiscoveryStore";
import DietaryFilterBar from "./DietaryFilterBar";
import SwipeDeck from "./SwipeDeck";
import LogoMarkSVG from "./brand/LogoMarkSVG";
import MascotFloat from "./MascotFloat";
import { canonicalizeTag } from "./taxonomy";
import { mockFriendsFor } from "./mockFriends";

/**
 * The complete discovery module — brings together filter bar, swipe
 * deck, and store. Meant to be dropped anywhere the app needs a
 * "browse restaurants" experience.
 *
 * Props:
 *   userId         : number | null   (null = anonymous; state stays local-only)
 *   withBackdrop   : boolean         (true = bubble-blue sky background)
 *   title, subtitle : optional custom header text
 */
export default function DiscoveryScreen({
  userId = null,
  withBackdrop = false,
  title = "Restaurants your body will thank you for",
  subtitle = "Swipe right to save, left to skip — we'll learn what works for you.",
}) {
  const navigate = useNavigate();
  const store = useDiscoveryStore(userId);

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [type, setType] = useState("All");
  const [sort, setSort] = useState("Best Match");
  const [activeTags, setActiveTags] = useState(() => new Set());
  const [view, setView] = useState("list");

  // Load once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await dataService.listRestaurants();
        const rows = Array.isArray(data) ? data : data.restaurants || [];
        if (!cancelled) setRestaurants(rows);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load restaurants.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cuisines = useMemo(() => {
    const set = new Set();
    restaurants.forEach((r) => { if (r.cuisine_type) set.add(r.cuisine_type); });
    return Array.from(set).sort();
  }, [restaurants]);

  const toggleTag = (tag) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };
  const clearTags = () => setActiveTags(new Set());

  // Derive filtered restaurants
  const filtered = useMemo(() => {
    let out = restaurants.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.cuisine_type || "").toLowerCase().includes(q)
      );
    }
    if (cuisine && cuisine !== "All") {
      out = out.filter((r) => r.cuisine_type === cuisine);
    }
    // Type pills map to our data's semantics
    if (type === "Liked") {
      out = out.filter((r) => store.isSaved(r.id));
    } else if (type === "Disliked") {
      out = out.filter((r) => store.isSkipped(r.id));
    } else if (type === "Loved by Friends") {
      out = out.filter((r) => mockFriendsFor(r.id).names.length > 0);
    } else if (type === "Bars & Drinks") {
      out = out.filter((r) => /bar|brew|pub|tavern/i.test(r.cuisine_type || ""));
    } else if (type === "Cafes & Treats") {
      out = out.filter((r) => /cafe|bakery|dessert|ice cream|coffee/i.test(r.cuisine_type || ""));
    } else if (type === "Restaurants") {
      out = out.filter((r) => !/bar|brew|pub|tavern|cafe|bakery|dessert|ice cream|coffee/i.test(r.cuisine_type || ""));
    }
    // Dietary: AND-match — restaurant must have all selected tags
    if (activeTags.size > 0) {
      out = out.filter((r) => {
        const tagSet = new Set();
        const cards = r.card_tags;
        if (Array.isArray(cards)) cards.forEach((t) => tagSet.add(canonicalizeTag(t)));
        else if (typeof cards === "string") {
          try { JSON.parse(cards).forEach((t) => tagSet.add(canonicalizeTag(t))); } catch {}
        }
        const dd = r.dietary_display_tags;
        if (Array.isArray(dd)) dd.forEach((t) => tagSet.add(canonicalizeTag(t)));
        const dt = r.dietary_tags;
        if (typeof dt === "string") {
          try { JSON.parse(dt).forEach((t) => tagSet.add(canonicalizeTag(t))); } catch {}
        }
        for (const t of activeTags) if (!tagSet.has(t)) return false;
        return true;
      });
    }
    if (sort === "Rating") {
      out.sort((a, b) => (b.display_rating || 0) - (a.display_rating || 0));
    } else if (sort === "Most Reviewed") {
      out.sort((a, b) => (b.display_review_count || 0) - (a.display_review_count || 0));
    } else if (sort === "Distance") {
      // Without geolocation, fall back to alphabetical
      out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return out;
  }, [restaurants, search, cuisine, type, sort, activeTags, store]);

  const onChat = (restaurant) => {
    // Route to the existing chat screen — same flow DashboardScreen already uses.
    navigate("/chat", { state: { restaurantId: restaurant.id, restaurantName: restaurant.name } });
  };

  return (
    <section
      className="cwm-discovery"
      data-with-backdrop={withBackdrop ? "true" : "false"}
    >
      <div className="cwm-discovery-inner">
        {/* FIX #4 — brand bar: logomark tile + stacked CHAT/WITH/MENU + tagline pill */}
        <header className="cwm-brand">
          <div className="cwm-brand-logomark">
            <LogoMarkSVG size={34} fill="#ffffff" />
          </div>
          <div className="cwm-brand-wordmark">
            <div className="cwm-brand-w-row">
              <span>CHAT</span>
              <span className="cwm-brand-w-with">WITH</span>
            </div>
            <div>MENU</div>
          </div>
          <div className="cwm-brand-tagline">Restaurant Discovery</div>
        </header>

        <DietaryFilterBar
          search={search} onSearchChange={setSearch}
          cuisine={cuisine} cuisines={cuisines} onCuisineChange={setCuisine}
          type={type} onTypeChange={setType}
          sort={sort} onSortChange={setSort}
          activeTags={activeTags}
          onToggleTag={toggleTag}
          onClearTags={clearTags}
          resultCount={filtered.length}
          totalCount={restaurants.length}
          city="New York City, NY"
          view={view}
          onViewChange={setView}
        />

        {loading && (
          <div className="cwm-discovery-state">Loading restaurants…</div>
        )}
        {error && !loading && (
          <div className="cwm-discovery-state cwm-discovery-error">{error}</div>
        )}
        {!loading && !error && (
          <SwipeDeck
            restaurants={filtered}
            store={store}
            onChat={onChat}
            activeTagSet={activeTags}
            onTagClick={toggleTag}
          />
        )}
      </div>
      {/* FIX #12 — floating mascot. Only on the public/full-backdrop view
          to avoid covering the dashboard's existing account section. */}
      {withBackdrop && <MascotFloat />}
    </section>
  );
}
