"use client";
// Minimal form-vs-ghost: a faint blue IDEAL skeleton, your crisp bone skeleton,
// and a basketball that arcs off the hand at release — auto-playing a smooth,
// frame-interpolated loop so it reads as a person actually shooting.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { detectShootingSide } from "@/lib/analysis";
import { isVisible } from "@/lib/vision/visibility";
import type { AnalysisResult, PoseFrame } from "@/lib/contracts";
import {
  drawBackdrop,
  drawBall,
  drawFlawMarker,
  drawGhostLines,
  drawHoop,
  drawPlayer,
  drawShotArc,
  drawVignette,
  flawConnectionKeys,
  jointsForFlaw,
  torsoLengthPx,
} from "./skeleton";

export interface GhostOverlayProps {
  result: AnalysisResult;
  width?: number;
  height?: number;
  className?: string;
  /** Canvas only — no chrome or playback controls (e.g. landing hero). */
  compact?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const HOLD_MS = 650; // pause on the follow-through before looping
const SPEED = 0.85;

/** Linear-interpolate two pose frames (by landmark name) for smooth motion. */
function lerpFrame(a: PoseFrame, b: PoseFrame, t: number): PoseFrame {
  if (a === b) return a;
  const bm = new Map(b.keypoints.map((k) => [k.name, k]));
  return {
    t: a.t + (b.t - a.t) * t,
    keypoints: a.keypoints.map((ka) => {
      const kb = bm.get(ka.name);
      if (!kb) return ka;
      return { name: ka.name, x: ka.x + (kb.x - ka.x) * t, y: ka.y + (kb.y - ka.y) * t, z: ka.z, score: Math.min(ka.score, kb.score) };
    }),
  };
}

export function GhostOverlay({ result, width = 440, height = 560, className, compact = false }: GhostOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frames = result.capture.frames;
  const ghostFrames = result.ghostRef;
  const total = frames.length;
  const fps = Math.max(1, result.capture.fps);
  const releaseIndex =
    total > 0 ? Math.min(result.metrics.releaseFrameIndex ?? 0, total - 1) : 0;

  const side = useMemo(() => detectShootingSide(result.capture), [result.capture]);
  const flawJoint = useMemo(() => jointsForFlaw(result.topFlaw.metric, side)[0], [result.topFlaw.metric, side]);
  const flawKeys = useMemo(() => (flawJoint ? flawConnectionKeys(flawJoint) : new Set<string>()), [flawJoint]);
  const shootWrist = `${side}_wrist`;

  // Release point + a hoop the shot arcs into (normalized coords).
  const releaseWrist = useMemo(
    () => frames[releaseIndex]?.keypoints.find((k) => k.name === shootWrist) ?? null,
    [frames, releaseIndex, shootWrist],
  );
  const hoop = useMemo(
    () => (releaseWrist ? { x: releaseWrist.x + 0.3, y: releaseWrist.y - 0.05 } : null),
    [releaseWrist],
  );

  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const playingRef = useRef(playing);
  const posRef = useRef(0); // float frame position
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // posRef survives effect re-runs — reset on a new capture. The rAF loop syncs
  // `index` from posRef, so no setState here (avoids cascading-render lint).
  useEffect(() => {
    posRef.current = 0;
  }, [result.capture.id, total]);

  // Stable fit transform (centers + scales the figure) from all visible poses.
  const fit = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const consider = (kps: { x: number; y: number; score?: number }[]) => {
      for (const k of kps) {
        if (!isVisible(k)) continue;
        if (k.x < minX) minX = k.x;
        if (k.x > maxX) maxX = k.x;
        if (k.y < minY) minY = k.y;
        if (k.y > maxY) maxY = k.y;
      }
    };
    for (const f of frames) consider(f.keypoints);
    for (const g of ghostFrames) consider(g.keypoints);
    // Include the hoop + shot arc so the whole shot stays in frame.
    if (releaseWrist && hoop) {
      for (let s = 0; s <= 10; s++) {
        const p = s / 10;
        const ax = releaseWrist.x + (hoop.x - releaseWrist.x) * p;
        const ay = releaseWrist.y + (hoop.y - releaseWrist.y) * p - 0.2 * 4 * p * (1 - p);
        if (ax < minX) minX = ax;
        if (ax > maxX) maxX = ax;
        if (ay < minY) minY = ay;
        if (ay > maxY) maxY = ay;
      }
    }
    if (!Number.isFinite(minX)) return { s: 1, cx: width / 2, cy: height / 2 };
    const bwPx = Math.max(1, (maxX - minX) * width);
    const bhPx = Math.max(1, (maxY - minY) * height);
    const s = Math.max(0.9, Math.min(2.8, Math.min((width * 0.7) / bwPx, (height * 0.82) / bhPx)));
    return { s, cx: ((minX + maxX) / 2) * width, cy: ((minY + maxY) / 2) * height };
  }, [frames, ghostFrames, releaseWrist, hoop, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    if (total === 0) {
      ctx.clearRect(0, 0, width, height);
      drawBackdrop(ctx, width, height);
      drawVignette(ctx, width, height);
      return;
    }
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let holding = 0;
    const start = last;
    let lastIdx = -1;

    const frameAt = (arr: PoseFrame[], pos: number): PoseFrame | null => {
      if (arr.length === 0) return null;
      const clamped = Math.max(0, Math.min(pos, arr.length - 1));
      const a = Math.floor(clamped);
      const b = Math.min(a + 1, arr.length - 1);
      const fa = arr[a];
      const fb = arr[b];
      if (!fa) return fb ?? null;
      if (!fb) return fa;
      if (a === b) return fa;
      return lerpFrame(fa, fb, clamped - a);
    };

    // Shot arc from the release point into the hoop (apex above the chord).
    const arcPoint = (p: number): { x: number; y: number } | null => {
      if (!releaseWrist || !hoop) return null;
      return {
        x: releaseWrist.x + (hoop.x - releaseWrist.x) * p,
        y: releaseWrist.y + (hoop.y - releaseWrist.y) * p - 0.2 * 4 * p * (1 - p),
      };
    };
    // Ball position (normalized): in the hand until release, then along the arc.
    const ballAt = (pos: number, userFrame: PoseFrame): { x: number; y: number } | null => {
      if (pos <= releaseIndex) {
        const k = userFrame.keypoints.find((p) => p.name === shootWrist && isVisible(p));
        return k ? { x: k.x, y: k.y } : null;
      }
      return arcPoint((pos - releaseIndex) / Math.max(1, total - 1 - releaseIndex));
    };

    const draw = (pos: number, now: number) => {
      ctx.clearRect(0, 0, width, height);
      drawBackdrop(ctx, width, height);
      const intro = reduced ? 1 : easeOutCubic(Math.min(1, (now - start) / 600));
      const user = frameAt(frames, pos);
      if (!user) {
        drawVignette(ctx, width, height);
        return;
      }
      const ghost = ghostFrames.length ? frameAt(ghostFrames, pos) : null;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(fit.s, fit.s);
      ctx.translate(-fit.cx, -fit.cy);
      if (ghost) drawGhostLines(ctx, ghost, width, height, intro);
      drawPlayer(ctx, user, width, height, flawKeys);
      const ballR = Math.max(7, torsoLengthPx(user, width, height) * 0.17);
      const curP = pos > releaseIndex ? (pos - releaseIndex) / Math.max(1, total - 1 - releaseIndex) : 0;
      // Hoop (target) — brightens with the swish ripple as the ball drops in.
      if (hoop) {
        const swish = curP <= 0.9 ? 0 : (curP - 0.9) / 0.1;
        drawHoop(ctx, hoop.x * width, hoop.y * height, ballR * 1.7, swish);
      }
      // Glowing shot-arc tracer along the ball's flight path into the hoop.
      if (pos > releaseIndex && hoop) {
        const steps = 16;
        const pts: { x: number; y: number }[] = [];
        for (let s = 0; s <= steps; s++) {
          const a = arcPoint(curP * (s / steps));
          if (a) pts.push({ x: a.x * width, y: a.y * height });
        }
        drawShotArc(ctx, pts);
      }
      const ball = ballAt(pos, user);
      if (ball) drawBall(ctx, ball.x * width, ball.y * height, ballR);
      if (flawJoint && pos >= releaseIndex - 1) {
        const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 420);
        drawFlawMarker(ctx, user, width, height, flawJoint, pulse);
      }
      ctx.restore();
      drawVignette(ctx, width, height);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (total > 0 && posRef.current > total - 1) {
        posRef.current = total - 1;
      }
      if (playingRef.current) {
        if (posRef.current >= total - 1) {
          holding += dt;
          if (holding >= HOLD_MS) {
            posRef.current = 0;
            holding = 0;
          }
        } else {
          posRef.current = Math.min(total - 1, posRef.current + (dt / 1000) * fps * SPEED);
        }
      }
      const idx = Math.round(posRef.current);
      if (idx !== lastIdx) {
        lastIdx = idx;
        setIndex(idx);
      }
      draw(posRef.current, now);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, frames, ghostFrames, total, fps, releaseIndex, flawKeys, flawJoint, shootWrist, releaseWrist, hoop, fit, width, height]);

  const releasePct = total > 1 ? (releaseIndex / (total - 1)) * 100 : 0;
  const posPct = total > 1 ? (index / (total - 1)) * 100 : 0;

  return (
    <div className={className} style={compact ? undefined : { width }}>
      <div
        className={compact ? "relative h-full w-full overflow-hidden" : "relative overflow-hidden rounded-xl"}
        style={
          compact
            ? undefined
            : { width, height, border: "1px solid var(--line)" }
        }
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={compact ? { width: "100%", height: "100%" } : undefined}
        />
        {!compact && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]" style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-ink)" }}>
              Form vs ghost
            </span>
            {Math.abs(index - releaseIndex) <= 1 && (
              <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: "var(--blue)", color: "#04080f" }}>
                Release
              </span>
            )}
          </div>
        )}
      </div>

      {!compact && (
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="grid size-9 shrink-0 place-items-center rounded-full text-[#04080f] transition hover:brightness-110"
          style={{ background: "var(--blue)" }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div className="relative h-1 flex-1 rounded-full" style={{ background: "var(--line)" }}>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${posPct}%`, background: "var(--blue)" }} />
          <div className="absolute top-1/2 h-2.5 w-px -translate-y-1/2" style={{ left: `${releasePct}%`, background: "var(--blue-soft)" }} title="Release" />
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--muted-ink)" }}>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: "var(--bone)" }} /> You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: "var(--blue)" }} /> Ideal
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
