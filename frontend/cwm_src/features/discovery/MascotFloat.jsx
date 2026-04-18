import React from "react";
import LogoMarkSVG from "./brand/LogoMarkSVG";

/**
 * Floating mascot — bottom-right, white silhouette, drop-shadow halo.
 *
 * Rendered once by DiscoveryScreen. Position is fixed to the viewport
 * and pointer-events disabled so it never intercepts clicks. React
 * handles re-render safety — no MutationObserver needed.
 */
export default function MascotFloat() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        right: 28,
        bottom: 28,
        width: 110,
        height: 90,
        zIndex: 1000000,
        opacity: 0.92,
        pointerEvents: "none",
        filter: "drop-shadow(0 14px 28px rgba(13, 71, 161, 0.4))",
      }}
    >
      <LogoMarkSVG size={110} fill="#ffffff" />
    </div>
  );
}
