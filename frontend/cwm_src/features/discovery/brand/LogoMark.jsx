import React from "react";
import logoFullBlue from "../../../assets/brand/logo-full-blue.png";
import logoFullBlack from "../../../assets/brand/logo-full-black.png";
import logoFullWhite from "../../../assets/brand/logo-full-white.png";

/**
 * Renders the Chat With Menu logo from one of the real brand PNG assets.
 *
 * Variants:
 *   - "full"  (default) — food bowl + stacked wordmark (cobalt blue)
 *   - "black"           — same, in black (for light-only contexts)
 *   - "white"           — same, in white (for dark / blue backgrounds)
 *
 * All PNGs are square-ish with generous whitespace; set `height` to
 * control rendered size.
 */
const SRC = {
  full: logoFullBlue,
  black: logoFullBlack,
  white: logoFullWhite,
};

export default function LogoMark({ variant = "full", height = 40, alt = "Chat With Menu", ...rest }) {
  const src = SRC[variant] || SRC.full;
  return (
    <img
      src={src}
      alt={alt}
      height={height}
      style={{ height: `${height}px`, width: "auto", display: "block" }}
      {...rest}
    />
  );
}
