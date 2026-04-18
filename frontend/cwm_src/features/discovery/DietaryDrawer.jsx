import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ALL_TAGS,
  GROUP_ORDER,
  TAG_GROUPS,
  classForGroup,
} from "./taxonomy";

/**
 * Dietary drawer — the full 97-tag picker.
 *
 * Desktop: non-modal popover anchored under the Dietary button. The
 *          background stays interactive.
 * Mobile:  bottom sheet with an overlay; tap overlay to dismiss.
 *
 * FIX #11 — zero inline color styles. Everything is driven by the
 * .cwm-grp-0 .. .cwm-grp-8 classes from tokens.css. Active state is
 * the .is-active modifier.
 */
export default function DietaryDrawer({ anchor, activeTags, onToggleTag, onClearTags, onClose }) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("Diet");
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );
  const drawerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ESC + outside-click close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);

    const onPointer = (e) => {
      const drawer = drawerRef.current;
      if (!drawer) return;
      if (drawer.contains(e.target)) return;
      if (anchor?.current && anchor.current.contains(e.target)) return;
      onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onPointer), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      clearTimeout(t);
    };
  }, [anchor, onClose]);

  // Desktop popover position
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!isDesktop || !anchor?.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const drawerW = 400;
    const left = Math.min(rect.left, window.innerWidth - drawerW - 16);
    setPos({ top: rect.bottom + 8 + window.scrollY, left });
  }, [isDesktop, anchor]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const matchesByGroup = useMemo(() => {
    if (!searching) return null;
    const out = {};
    GROUP_ORDER.forEach((g) => {
      const list = TAG_GROUPS[g].filter((t) => t.toLowerCase().includes(q));
      if (list.length) out[g] = list;
    });
    return out;
  }, [searching, q]);

  const activeByGroup = useMemo(() => {
    const out = {};
    GROUP_ORDER.forEach((g) => {
      out[g] = TAG_GROUPS[g].filter((t) => activeTags.has(t)).length;
    });
    return out;
  }, [activeTags]);

  const style = isDesktop && pos ? { top: pos.top, left: pos.left } : {};

  const content = (
    <>
      {!isDesktop && <div className="cwm-drawer-overlay" onClick={onClose} />}

      <div
        className={`cwm-discovery cwm-drawer${isDesktop ? " cwm-drawer-desktop" : " cwm-drawer-sheet"}`}
        style={style}
        ref={drawerRef}
        role="dialog"
        aria-label="Dietary filters"
      >
        <div className="cwm-drawer-head">
          <h3>Dietary &amp; lifestyle</h3>
          <button className="cwm-drawer-close" onClick={onClose} aria-label="Close dietary filters">×</button>
        </div>

        <div className="cwm-drawer-subhead">
          {searching
            ? `Searching all ${ALL_TAGS.length} tags`
            : `${ALL_TAGS.length} tags · ${GROUP_ORDER.length} groups`}
        </div>

        <input
          type="text"
          className="cwm-drawer-search"
          placeholder="Search tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {!searching && (
          <div className="cwm-drawer-tabs">
            {GROUP_ORDER.map((g) => {
              const active = g === activeGroup;
              const count = activeByGroup[g];
              const cls = classForGroup(g);
              return (
                <button
                  key={g}
                  type="button"
                  className={`cwm-drawer-tab ${cls}${active ? " is-active" : ""}`}
                  onClick={() => setActiveGroup(g)}
                >
                  {g}
                  {count > 0 && <span className="cwm-drawer-tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="cwm-drawer-body">
          {searching ? (
            matchesByGroup && Object.keys(matchesByGroup).length > 0 ? (
              Object.entries(matchesByGroup).map(([g, tags]) => (
                <DrawerSection key={g} group={g} tags={tags} activeTags={activeTags} onToggleTag={onToggleTag} />
              ))
            ) : (
              <div className="cwm-drawer-empty">No tags match your search.</div>
            )
          ) : (
            <DrawerSection
              group={activeGroup}
              tags={TAG_GROUPS[activeGroup]}
              activeTags={activeTags}
              onToggleTag={onToggleTag}
              hideHeader
            />
          )}
        </div>

        <div className="cwm-drawer-footer">
          <span className="cwm-drawer-count">
            {activeTags.size} {activeTags.size === 1 ? "filter" : "filters"} active
          </span>
          {activeTags.size > 0 && (
            <button className="cwm-drawer-clear" onClick={onClearTags}>Clear all</button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

function DrawerSection({ group, tags, activeTags, onToggleTag, hideHeader = false }) {
  const cls = classForGroup(group);
  return (
    <div className="cwm-drawer-section">
      {!hideHeader && (
        <div className={`cwm-drawer-subgroup-label ${cls}`}>
          {group} · {tags.length}
        </div>
      )}
      <div className="cwm-drawer-pills">
        {tags.map((tag) => {
          const active = activeTags.has(tag);
          return (
            <button
              key={tag}
              type="button"
              className={`cwm-drawer-pill ${cls}${active ? " is-active" : ""}`}
              onClick={() => onToggleTag(tag)}
              aria-pressed={active}
            >
              <span className="cwm-drawer-pill-dot" />
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
