// Canvas skeleton drawing, keyed by landmark NAME so it works for both a live
// 33-point MediaPipe capture and the 13-name fixtures. Pure helpers (the draw
// functions take a 2D context; nothing here touches React).
import type { JointMetrics, PoseFrame } from "@/lib/contracts";

/** Bone connections as [nameA, nameB] pairs. */
export const POSE_CONNECTIONS_BY_NAME: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

/** Joint names we draw a dot for (skeleton joints + nose), de-duped. */
export const JOINT_NAMES: string[] = Array.from(
  new Set<string>(["nose", ...POSE_CONNECTIONS_BY_NAME.flat()]),
);

/** Which joint(s) to highlight for a given flaw metric, on the shooting side. */
export function jointsForFlaw(metric: keyof JointMetrics | string, side: "left" | "right"): string[] {
  const guide = side === "right" ? "left" : "right";
  switch (metric) {
    case "releaseElbowAngle":
      return [`${side}_elbow`];
    case "kneeFlexionAtDip":
      return ["left_knee", "right_knee"];
    case "wristSnapTiming":
    case "releaseHeight":
      return [`${side}_wrist`];
    case "guideHandPresence":
      return [`${guide}_wrist`];
    default:
      return [];
  }
}

function nameMap(frame: PoseFrame): Map<string, { x: number; y: number }> {
  return new Map(frame.keypoints.map((k) => [k.name, { x: k.x, y: k.y }]));
}

/** Count connections whose endpoints both exist (used by the verify harness). */
export function resolvableConnections(frame: PoseFrame): number {
  const map = nameMap(frame);
  return POSE_CONNECTIONS_BY_NAME.filter(([a, b]) => map.has(a) && map.has(b)).length;
}

export interface SkeletonStyle {
  color: string;
  lineWidth: number;
  radius: number;
  dashed?: boolean;
}

/** Draw a skeleton (bones + joint dots) for one frame into a W×H canvas space. */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  w: number,
  h: number,
  style: SkeletonStyle,
): void {
  const map = nameMap(frame);
  ctx.save();
  ctx.setLineDash(style.dashed ? [6, 6] : []);
  ctx.strokeStyle = style.color;
  ctx.fillStyle = style.color;
  ctx.lineWidth = style.lineWidth;
  for (const [a, b] of POSE_CONNECTIONS_BY_NAME) {
    const ka = map.get(a);
    const kb = map.get(b);
    if (ka && kb) {
      ctx.beginPath();
      ctx.moveTo(ka.x * w, ka.y * h);
      ctx.lineTo(kb.x * w, kb.y * h);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  for (const name of JOINT_NAMES) {
    const k = map.get(name);
    if (k) {
      ctx.beginPath();
      ctx.arc(k.x * w, k.y * h, style.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draw an attention ring around the flawed joint(s). */
export function drawHighlight(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  names: string[],
  w: number,
  h: number,
  color: string,
): void {
  const map = nameMap(frame);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const name of names) {
    const k = map.get(name);
    if (k) {
      ctx.beginPath();
      ctx.arc(k.x * w, k.y * h, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
