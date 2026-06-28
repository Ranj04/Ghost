// PERSON A (works on main) — overlay component surface. See OWNERSHIP.md.
export { GhostOverlay, type GhostOverlayProps } from "./GhostOverlay";
export {
  drawBackdrop,
  drawVignette,
  drawGhostFigure,
  drawPlayerSkeleton,
  drawDeviation,
  flawConnectionKeys,
  jointsForFlaw,
  resolvableConnections,
  POSE_CONNECTIONS_BY_NAME,
  JOINT_NAMES,
} from "./skeleton";
