// PERSON A (works on main) — overlay component surface. See OWNERSHIP.md.
export { GhostOverlay, type GhostOverlayProps } from "./GhostOverlay";
export {
  drawSkeleton,
  drawHighlight,
  jointsForFlaw,
  resolvableConnections,
  POSE_CONNECTIONS_BY_NAME,
  JOINT_NAMES,
  type SkeletonStyle,
} from "./skeleton";
