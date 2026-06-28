// Canvas drawing for the form-vs-ghost signature, keyed by landmark NAME so it
// works for a live 33-point MediaPipe capture and the 13-name fixtures.
//
// Design: "motion-capture at night." The IDEAL is a luminous aqua light-figure
// (glowing neon bones with a bright core) — reads as a hologram you chase. YOU
// are a crisp bone-white skeleton on top. One coral deviation shows the gap to
// the ideal. Glowing-aqua-behind / crisp-white-in-front keeps it legible.
import type { JointMetrics, PoseFrame } from "@/lib/contracts";

const INK = "#0E1116";
const GHOST = "#4FD6E0";
const BONE = "#F2F0E9";
const SIGNAL = "#FF6B4A";

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

export const JOINT_NAMES: string[] = Array.from(new Set<string>(["nose", ...POSE_CONNECTIONS_BY_NAME.flat()]));

export function jointsForFlaw(metric: keyof JointMetrics | string, side: "left" | "right"): string[] {
  const guide = side === "right" ? "left" : "right";
  switch (metric) {
    case "releaseElbowAngle":
      return [`${side}_elbow`];
    case "kneeFlexionAtDip":
      return [`${side}_knee`];
    case "wristSnapTiming":
    case "releaseHeight":
      return [`${side}_wrist`];
    case "guideHandPresence":
      return [`${guide}_wrist`];
    default:
      return [];
  }
}

interface PxPoint {
  x: number;
  y: number;
}

function pxMap(frame: PoseFrame, w: number, h: number): Map<string, PxPoint> {
  return new Map(frame.keypoints.map((k) => [k.name, { x: k.x * w, y: k.y * h }]));
}

function midpoint(a?: PxPoint, b?: PxPoint): PxPoint | undefined {
  if (!a || !b) return undefined;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pxDist(a: PxPoint, b: PxPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function torsoScale(map: Map<string, PxPoint>, w: number, h: number): number {
  const sc = midpoint(map.get("left_shoulder"), map.get("right_shoulder"));
  const hc = midpoint(map.get("left_hip"), map.get("right_hip"));
  return sc && hc ? pxDist(sc, hc) : Math.min(w, h) * 0.18;
}

export function resolvableConnections(frame: PoseFrame): number {
  const map = new Map(frame.keypoints.map((k) => [k.name, k]));
  return POSE_CONNECTIONS_BY_NAME.filter(([a, b]) => map.has(a) && map.has(b)).length;
}

function strokeBones(ctx: CanvasRenderingContext2D, map: Map<string, PxPoint>): void {
  for (const [a, b] of POSE_CONNECTIONS_BY_NAME) {
    const pa = map.get(a);
    const pb = map.get(b);
    if (pa && pb) {
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }
}

function disc(ctx: CanvasRenderingContext2D, p: PxPoint | undefined, r: number): void {
  if (!p) return;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Dark gym stage: deep radial ink + faint aqua floor glow. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.05, w * 0.5, h * 0.55, Math.max(w, h) * 0.8);
  g.addColorStop(0, "#121A24");
  g.addColorStop(0.6, "#0c121b");
  g.addColorStop(1, INK);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const floor = ctx.createRadialGradient(w * 0.5, h * 0.9, 4, w * 0.5, h * 0.9, w * 0.46);
  floor.addColorStop(0, "rgba(79, 214, 224, 0.10)");
  floor.addColorStop(1, "rgba(79, 214, 224, 0)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
}

/** Edge vignette, drawn last. */
export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const v = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.4, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  v.addColorStop(0, "rgba(14,17,22,0)");
  v.addColorStop(1, "rgba(14,17,22,0.5)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** The IDEAL: a luminous aqua light-figure (glowing tubes + bright core).
 *  `intro` (0..1) fades it in. */
export function drawGhostFigure(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number, intro = 1): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  const tube = Math.max(7, Math.min(16, T * 0.12));
  const nose = map.get("nose");

  ctx.save();
  ctx.globalAlpha = intro;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Outer glow tube.
  ctx.strokeStyle = "rgba(79, 214, 224, 0.45)";
  ctx.shadowColor = GHOST;
  ctx.shadowBlur = 24;
  ctx.lineWidth = tube;
  strokeBones(ctx, map);
  if (nose) {
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, Math.max(10, T * 0.18), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Bright inner core.
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "rgba(190, 247, 252, 0.9)";
  ctx.lineWidth = Math.max(2, tube * 0.34);
  strokeBones(ctx, map);
  if (nose) {
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, Math.max(10, T * 0.18), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** YOU: a crisp bone-white skeleton. Bones in `flawKeys` render coral. */
export function drawPlayerSkeleton(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number, flawKeys: Set<string>): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  const lw = Math.max(2.5, Math.min(5, T * 0.05));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lw;
  for (const [a, b] of POSE_CONNECTIONS_BY_NAME) {
    const pa = map.get(a);
    const pb = map.get(b);
    if (!pa || !pb) continue;
    const isFlaw = flawKeys.has(`${a}|${b}`);
    ctx.strokeStyle = isFlaw ? SIGNAL : BONE;
    ctx.shadowColor = isFlaw ? SIGNAL : "rgba(0,0,0,0.5)";
    ctx.shadowBlur = isFlaw ? 12 : 3;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = BONE;
  for (const name of JOINT_NAMES) {
    const k = map.get(name);
    if (k) disc(ctx, k, Math.max(2.5, T * 0.028));
  }
  const head = map.get("nose");
  if (head) {
    ctx.strokeStyle = BONE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(head.x, head.y, Math.max(8, T * 0.16), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The single deviation: coral marker on your flawed joint + a thin dashed
 *  connector to where the ideal joint sits (the gap). Minimal, no labels. */
export function drawDeviation(ctx: CanvasRenderingContext2D, userFrame: PoseFrame, ghostFrame: PoseFrame, w: number, h: number, joint: string, pulse: number): void {
  const um = pxMap(userFrame, w, h);
  const gm = pxMap(ghostFrame, w, h);
  const T = torsoScale(um, w, h);
  const uj = um.get(joint);
  const gj = gm.get(joint);
  if (!uj) return;

  ctx.save();
  ctx.strokeStyle = SIGNAL;
  ctx.fillStyle = SIGNAL;
  ctx.shadowColor = SIGNAL;

  if (gj && pxDist(uj, gj) > T * 0.06) {
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(uj.x, uj.y);
    ctx.lineTo(gj.x, gj.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gj.x, gj.y, Math.max(4, T * 0.05), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 10 + pulse * 8;
  disc(ctx, uj, Math.max(4, T * 0.045));
  ctx.restore();
}

export function flawConnectionKeys(joint: string): Set<string> {
  const keys = new Set<string>();
  for (const [a, b] of POSE_CONNECTIONS_BY_NAME) {
    if (a === joint || b === joint) keys.add(`${a}|${b}`);
  }
  return keys;
}
