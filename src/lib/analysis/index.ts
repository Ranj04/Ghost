// PERSON A (works on main) — analysis module public surface. See OWNERSHIP.md.
export { analyzeShot } from "./analyzeShot";
export { detectRelease, detectShootingSide, type Side } from "./detectRelease";
export { extractMetrics } from "./extractMetrics";
export { detectFlaws, scoreForm, type FlawResult } from "./flaws";
export { alignToReference } from "./align";
export { normalize, normalizeFrame, hipCenter, shoulderCenter, torsoLength } from "./normalize";
export { REFERENCE_FRAMES, REFERENCE_CAPTURE, REFERENCE_METRICS } from "./reference";
export { angleDeg, dist, kp, type Pt } from "./geometry";
