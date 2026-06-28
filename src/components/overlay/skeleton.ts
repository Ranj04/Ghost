// Canvas drawing for the form-comparison overlay, keyed by landmark NAME so it
// works for both a live 33-point MediaPipe capture and the 13-name fixtures.
//
// Aesthetic: a cinematic "form vs ghost" — both figures are rendered as smooth
// human SILHOUETTES, not stick lines. The trick for clean silhouettes is to fill
// the body opaque on an offscreen buffer, then stamp it once with alpha + blur,
// so overlapping limbs union instead of darkening at the seams. The reference is
// a soft luminous "ghost" behind; the athlete is a vivid figure on top, so the
// gap between them is the visible story.
import type { JointMetrics, PoseFrame } from "@/lib/contracts";

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

/** Torso length in pixels — the scale unit for body proportions. */
function torsoScale(map: Map<string, PxPoint>, w: number, h: number): number {
  const sc = midpoint(map.get("left_shoulder"), map.get("right_shoulder"));
  const hc = midpoint(map.get("left_hip"), map.get("right_hip"));
  return sc && hc ? pxDist(sc, hc) : Math.min(w, h) * 0.18;
}

export function resolvableConnections(frame: PoseFrame): number {
  const map = new Map(frame.keypoints.map((k) => [k.name, k]));
  return POSE_CONNECTIONS_BY_NAME.filter(([a, b]) => map.has(a) && map.has(b)).length;
}

/** A tapered limb: a trapezoid between two joints, capped by a circle at each. */
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
  ctx.beginPath();
  ctx.arc(a.x, a.y, ra, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, rb, 0, Math.PI * 2);
  ctx.fill();
}

function disc(ctx: CanvasRenderingContext2D, p: PxPoint | undefined, r: number): void {
  if (!p) return;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Fill an anatomically-proportioned human body (opaque, current fillStyle) from
 * the frame's keypoints. Limbs taper; the union of overlapping parts reads as a
 * single smooth silhouette when rendered opaque and composited once.
 */
export function fillBody(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  const P = (n: string) => map.get(n);
  const ls = P("left_shoulder");
  const rs = P("right_shoulder");
  const lh = P("left_hip");
  const rh = P("right_hip");

  // Torso slab + rounded shoulders/hips.
  if (ls && rs && rh && lh) {
    ctx.beginPath();
    ctx.moveTo(ls.x, ls.y);
    ctx.lineTo(rs.x, rs.y);
    ctx.lineTo(rh.x, rh.y);
    ctx.lineTo(lh.x, lh.y);
    ctx.closePath();
    ctx.fill();
  }
  disc(ctx, ls, 0.11 * T);
  disc(ctx, rs, 0.11 * T);
  disc(ctx, lh, 0.1 * T);
  disc(ctx, rh, 0.1 * T);

  // Arms (taper shoulder -> elbow -> wrist).
  limb(ctx, ls, P("left_elbow"), 0.085 * T, 0.068 * T);
  limb(ctx, P("left_elbow"), P("left_wrist"), 0.068 * T, 0.05 * T);
  limb(ctx, rs, P("right_elbow"), 0.085 * T, 0.068 * T);
  limb(ctx, P("right_elbow"), P("right_wrist"), 0.068 * T, 0.05 * T);

  // Legs (taper hip -> knee -> ankle).
  limb(ctx, lh, P("left_knee"), 0.12 * T, 0.088 * T);
  limb(ctx, P("left_knee"), P("left_ankle"), 0.088 * T, 0.062 * T);
  limb(ctx, rh, P("right_knee"), 0.12 * T, 0.088 * T);
  limb(ctx, P("right_knee"), P("right_ankle"), 0.088 * T, 0.062 * T);

  // Hands / feet rounding.
  disc(ctx, P("left_wrist"), 0.05 * T);
  disc(ctx, P("right_wrist"), 0.05 * T);
  disc(ctx, P("left_ankle"), 0.055 * T);
  disc(ctx, P("right_ankle"), 0.055 * T);

  // Neck + head.
  const sc = midpoint(ls, rs);
  const nose = P("nose");
  if (sc) {
    const headC = nose ? { x: nose.x, y: nose.y } : { x: sc.x, y: sc.y - 0.5 * T };
    limb(ctx, sc, { x: headC.x, y: headC.y + 0.12 * T }, 0.06 * T, 0.07 * T);
    disc(ctx, headC, 0.15 * T);
  }
}

/** Depth-gradient stage + a soft cyan ground glow under the figures. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.38, Math.min(w, h) * 0.05, w * 0.5, h * 0.55, Math.max(w, h) * 0.78);
  g.addColorStop(0, "#0e1a2c");
  g.addColorStop(0.6, "#070d18");
  g.addColorStop(1, "#04060c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const floor = ctx.createRadialGradient(w * 0.5, h * 0.92, 4, w * 0.5, h * 0.92, w * 0.5);
  floor.addColorStop(0, "rgba(56, 189, 248, 0.12)");
  floor.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
}

interface Offscreen {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function stamp(main: CanvasRenderingContext2D, off: Offscreen, w: number, h: number, alpha: number, blur: number, glow: string): void {
  main.save();
  main.globalAlpha = alpha;
  main.shadowColor = glow;
  main.shadowBlur = (blur || 0) + 14;
  if (blur) main.filter = `blur(${blur}px)`;
  main.drawImage(off.canvas, 0, 0, off.canvas.width, off.canvas.height, 0, 0, w, h);
  main.restore();
}

/** The reference, as a soft luminous "ghost" silhouette behind the athlete. */
export function drawGhostFigure(main: CanvasRenderingContext2D, off: Offscreen, frame: PoseFrame, w: number, h: number): void {
  off.ctx.clearRect(0, 0, w, h);
  const g = off.ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#e0f2fe");
  g.addColorStop(1, "#93c5fd");
  off.ctx.fillStyle = g;
  fillBody(off.ctx, frame, w, h);
  stamp(main, off, w, h, 0.3, 6, "rgba(147, 197, 253, 0.65)");
}

/** The athlete ("you"), a vivid silhouette with a rim-light glow, on top. */
export function drawAthleteFigure(main: CanvasRenderingContext2D, off: Offscreen, frame: PoseFrame, w: number, h: number): void {
  off.ctx.clearRect(0, 0, w, h);
  const g = off.ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#5eead4");
  g.addColorStop(0.5, "#22d3ee");
  g.addColorStop(1, "#6366f1");
  off.ctx.fillStyle = g;
  fillBody(off.ctx, frame, w, h);
  stamp(main, off, w, h, 0.92, 0, "rgba(34, 211, 238, 0.6)");
}

/** Pulsing attention ring around the flawed joint(s). `pulse` (0..1) breathes it. */
export function drawHighlight(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  names: string[],
  w: number,
  h: number,
  color: string,
  pulse = 0,
): void {
  const map = pxMap(frame, w, h);
  const t = torsoScale(map, w, h);
  const base = Math.max(14, t * 0.26);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  for (const name of names) {
    const k = map.get(name);
    if (!k) continue;
    ctx.globalAlpha = 0.3 + 0.4 * (1 - pulse);
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(k.x, k.y, base + pulse * base * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(k.x, k.y, base * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export type { Offscreen };
