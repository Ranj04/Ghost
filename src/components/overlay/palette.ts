// The Ghost palette — "motion-capture at night". Single source for the brand
// colors used across the capture preview and the form-vs-ghost canvas, so no
// component hardcodes a hex. Canvas (2D context) can't consume CSS classes, so
// these are real values rather than Tailwind tokens.
export const INK = "#0E1116"; // background / on-aqua text
export const SURFACE = "#232A33"; // hairline borders, scrubber track
export const BONE = "#F2F0E9"; // you / primary text on ink
export const GHOST = "#4FD6E0"; // the ideal reference (aqua)
export const SIGNAL = "#FF6B4A"; // the one deviation / error (coral)
export const MUTED = "#8B93A0"; // secondary labels on ink
