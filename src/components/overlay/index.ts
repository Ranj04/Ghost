// PERSON A (works on main) — overlay component surface. See OWNERSHIP.md.
export { GhostOverlay, type GhostOverlayProps } from "./GhostOverlay";
export { INK, SURFACE, BONE, GHOST, SIGNAL, MUTED } from "./palette";
export {
  drawBackdrop,
  drawVignette,
  drawGhostSilhouette,
  drawPlayerSkeleton,
  drawDeviation,
  flawConnectionKeys,
  jointsForFlaw,
  resolvableConnections,
  POSE_CONNECTIONS_BY_NAME,
  JOINT_NAMES,
  type Offscreen,
} from "./skeleton";
