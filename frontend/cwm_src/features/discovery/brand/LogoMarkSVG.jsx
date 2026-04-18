import React from "react";

/**
 * Inline-SVG Chat With Menu logo mark (no wordmark).
 *
 * Used when we need *just* the glyph — inside a colored tile (brand bar,
 * CTA button lead). The PNG logo is still the go-to when the stacked
 * wordmark is part of the asset.
 *
 * Reproduces the mark from the Instagram branding: bread loaf, heart,
 * avocado, lettuce sprig, carrot, all in white above a speech-bubble
 * bowl with three dots.
 */
export default function LogoMarkSVG({ size = 34, fill = "#ffffff" }) {
  const height = size * 180 / 220;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 180"
      width={size}
      height={height}
      aria-label="Chat With Menu"
      style={{ display: "block" }}
    >
      <g fill={fill}>
        {/* Bread loaf */}
        <g transform="translate(40,18) rotate(-18)">
          <ellipse cx="22" cy="50" rx="22" ry="48" />
        </g>
        {/* Heart */}
        <path d="M104 22 C100 14 88 14 88 26 C88 36 104 48 110 52 C116 48 132 36 132 26 C132 14 120 14 116 22 C113 26 107 26 104 22 Z" />
        {/* Avocado */}
        <g transform="translate(132,30) rotate(20)">
          <ellipse cx="20" cy="32" rx="18" ry="26" />
          <ellipse cx="20" cy="34" rx="9" ry="13" fill="#1E9BFF" />
          <circle cx="20" cy="34" r="4" fill={fill} />
        </g>
        {/* Lettuce */}
        <g transform="translate(78,72)">
          <path d="M0 30 Q6 0 24 6 Q40 -2 48 18 Q60 12 56 36 Q40 50 24 44 Q12 50 0 30 Z" />
        </g>
        {/* Carrot */}
        <g transform="translate(168,42) rotate(18)">
          <path d="M0 0 L20 0 L10 70 Z" />
        </g>
        {/* Speech-bubble bowl */}
        <path d="M20 110 Q20 100 32 100 L188 100 Q200 100 200 110 L200 138 Q200 168 168 168 L72 168 L52 180 L60 168 L52 168 Q20 168 20 138 Z" />
        <circle cx="78"  cy="138" r="8" fill="#1E9BFF" />
        <circle cx="110" cy="138" r="8" fill="#1E9BFF" />
        <circle cx="142" cy="138" r="8" fill="#1E9BFF" />
      </g>
    </svg>
  );
}
