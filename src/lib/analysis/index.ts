// PERSON A (works on main) — analysis module public surface. See OWNERSHIP.md.
// analyzeShot lands in Phase A3; for now release detection + metrics are exposed.
export { detectRelease, detectShootingSide, type Side } from "./detectRelease";
export { extractMetrics } from "./extractMetrics";
export { angleDeg, dist, kp, type Pt } from "./geometry";
