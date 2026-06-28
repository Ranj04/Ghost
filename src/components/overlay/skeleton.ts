// Canvas drawing for the form-vs-ghost signature, keyed by landmark NAME so it
// works for a live 33-point MediaPipe capture and the 13-name fixtures.
//
// Design: "motion-capture at night." The IDEAL is a luminous aqua light-figure
// (glowing neon bones with a bright core) — reads as a hologram you chase. YOU
// are a crisp bone-white skeleton on top. One coral deviation shows the gap to
// the ideal. Glowing-aqua-behind / crisp-white-in-front keeps it legible.
import type { JointMetrics, PoseFrame } from "@/lib/contracts";
import { isVisible } from "@/lib/vision/visibility";
import { BONE, GHOST, INK, SIGNAL } from "./palette";

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

// Only VISIBLE keypoints make it into the draw map — bones/nodes to invented or
// off-frame joints are dropped, not drawn.
function pxMap(frame: PoseFrame, w: number, h: number): Map<string, PxPoint> {
  const m = new Map<string, PxPoint>();
  for (const k of frame.keypoints) {
    if (isVisible(k)) m.set(k.name, { x: k.x * w, y: k.y * h });
  }
  return m;
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

function disc(ctx: CanvasRenderingContext2D, p: PxPoint | undefined, r: number): void {
  if (!p) return;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A tapered limb: trapezoid between two joints + a rounding disc at each end. */
function limb(ctx: CanvasRenderingContext2D, a?: PxPoint, b?: PxPoint, ra = 6, rb = 5): void {
  if (!a || !b) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(a.x + nx * ra, a.y + ny * ra);
  ctx.lineTo(b.x + nx * rb, b.y + ny * rb);
  ctx.lineTo(b.x - nx * rb, b.y - ny * rb);
  ctx.lineTo(a.x - nx * ra, a.y - ny * ra);
  ctx.closePath();
  ctx.fill();
  disc(ctx, a, ra);
  disc(ctx, b, rb);
}

/** A soft rounded polygon (quadratic curves through edge midpoints). */
function roundedPolygon(ctx: CanvasRenderingContext2D, pts: PxPoint[]): void {
  if (pts.length < 3) return;
  const m = (p: PxPoint, q: PxPoint) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const startMid = m(pts[pts.length - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(startMid.x, startMid.y);
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const next = m(pts[i], pts[(i + 1) % pts.length]);
    ctx.quadraticCurveTo(cur.x, cur.y, next.x, next.y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Fill an anatomically-proportioned body (opaque, current fillStyle) from the
 *  VISIBLE keypoints — tapered limbs + a rounded torso union into one smooth
 *  silhouette when composited once. */
function fillBody(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  const P = (n: string) => map.get(n);
  const ls = P("left_shoulder");
  const rs = P("right_shoulder");
  const lh = P("left_hip");
  const rh = P("right_hip");

  // Solid trunk along the spine gives the side-on torso real body mass (a thin
  // shoulders->hips quad alone reads as a paper sliver).
  const trunkTop = midpoint(ls, rs);
  const trunkBot = midpoint(lh, rh);
  if (trunkTop && trunkBot) limb(ctx, trunkTop, trunkBot, 0.18 * T, 0.16 * T);
  if (ls && rs && rh && lh) roundedPolygon(ctx, [ls, rs, rh, lh]);
  disc(ctx, ls, 0.12 * T);
  disc(ctx, rs, 0.12 * T);
  disc(ctx, lh, 0.12 * T);
  disc(ctx, rh, 0.12 * T);

  limb(ctx, ls, P("left_elbow"), 0.08 * T, 0.065 * T);
  limb(ctx, P("left_elbow"), P("left_wrist"), 0.065 * T, 0.048 * T);
  limb(ctx, rs, P("right_elbow"), 0.08 * T, 0.065 * T);
  limb(ctx, P("right_elbow"), P("right_wrist"), 0.065 * T, 0.048 * T);
  limb(ctx, lh, P("left_knee"), 0.115 * T, 0.085 * T);
  limb(ctx, P("left_knee"), P("left_ankle"), 0.085 * T, 0.06 * T);
  limb(ctx, rh, P("right_knee"), 0.115 * T, 0.085 * T);
  limb(ctx, P("right_knee"), P("right_ankle"), 0.085 * T, 0.06 * T);

  disc(ctx, P("left_wrist"), 0.048 * T);
  disc(ctx, P("right_wrist"), 0.048 * T);
  disc(ctx, P("left_ankle"), 0.055 * T);
  disc(ctx, P("right_ankle"), 0.055 * T);

  const sc = midpoint(ls, rs);
  const nose = P("nose");
  if (sc) {
    const headC = nose ?? { x: sc.x, y: sc.y - 0.5 * T };
    limb(ctx, sc, { x: headC.x, y: headC.y + 0.12 * T }, 0.055 * T, 0.06 * T);
    ctx.beginPath();
    ctx.ellipse(headC.x, headC.y, T * 0.13, T * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
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

export interface Offscreen {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/** The IDEAL: a luminous aqua FILLED silhouette. The body is filled opaque on an
 *  offscreen buffer, then stamped once at low opacity with an outer glow — so
 *  overlapping limbs union into a smooth hologram (no seams, no tube-lines).
 *  Stamped within the caller's fit transform, so it aligns with the player.
 *  `intro` (0..1) fades it in. */
export function drawGhostSilhouette(main: CanvasRenderingContext2D, off: Offscreen, frame: PoseFrame, w: number, h: number, intro = 1): void {
  off.ctx.clearRect(0, 0, w, h);
  off.ctx.fillStyle = GHOST;
  fillBody(off.ctx, frame, w, h);

  main.save();
  // Two stamps: a soft wide glow, then a slightly crisper body — reads as a
  // luminous hologram with presence without looking solid.
  main.shadowColor = GHOST;
  main.globalAlpha = 0.16 * intro;
  main.shadowBlur = 34;
  main.drawImage(off.canvas, 0, 0, off.canvas.width, off.canvas.height, 0, 0, w, h);
  main.globalAlpha = 0.22 * intro;
  main.shadowBlur = 14;
  main.drawImage(off.canvas, 0, 0, off.canvas.width, off.canvas.height, 0, 0, w, h);
  main.restore();
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

const CHILD_JOINT: Record<string, string> = {
  right_shoulder: "right_elbow", left_shoulder: "left_elbow",
  right_elbow: "right_wrist", left_elbow: "left_wrist",
  right_wrist: "right_elbow", left_wrist: "left_elbow",
  right_hip: "right_knee", left_hip: "left_knee",
  right_knee: "right_ankle", left_knee: "left_ankle",
};

/** The single deviation: coral marker on your flawed joint, a thin dashed
 *  connector to where the ideal joint sits, and a small arc showing the angular
 *  gap between your bone and the ideal bone. One flaw only — no clutter. */
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

  // Angle-delta arc: the sweep between your bone and the ideal bone direction.
  const childName = CHILD_JOINT[joint];
  const uc = childName ? um.get(childName) : undefined;
  const gc = childName ? gm.get(childName) : undefined;
  if (uc && gc && gj) {
    const a1 = Math.atan2(uc.y - uj.y, uc.x - uj.x);
    const a2 = Math.atan2(gc.y - gj.y, gc.x - gj.x);
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 0.05) {
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(uj.x, uj.y, Math.max(14, T * 0.26), a1, a1 + d, d < 0);
      ctx.stroke();
    }
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
