"use client";
// The form-vs-ghost signature: a luminous aqua IDEAL light-figure with your crisp
// BONE skeleton on top and one coral deviation showing the gap. A single rAF loop
// drives the eased ghost intro, the deviation pulse, and playback. Retina-aware.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { detectShootingSide } from "@/lib/analysis";
import { isVisible } from "@/lib/vision/visibility";
import type { AnalysisResult } from "@/lib/contracts";
import {
  drawBackdrop,
  drawDeviation,
  drawGhostSilhouette,
  drawPlayerSkeleton,
  drawVignette,
  flawConnectionKeys,
  jointsForFlaw,
  type Offscreen,
} from "./skeleton";

export interface GhostOverlayProps {
  result: AnalysisResult;
  width?: number;
  height?: number;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function GhostOverlay({ result, width = 440, height = 560, className }: GhostOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offRef = useRef<Offscreen | null>(null);
  const frames = result.capture.frames;
  const total = frames.length;
  const fps = Math.max(1, result.capture.fps);
  const releaseIndex = Math.min(result.metrics.releaseFrameIndex ?? 0, total - 1);

  const [index, setIndex] = useState(releaseIndex);
  const [playing, setPlaying] = useState(false);
  const indexRef = useRef(index);
  const playingRef = useRef(playing);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const side = useMemo(() => detectShootingSide(result.capture), [result.capture]);
  const flawJoint = useMemo(() => jointsForFlaw(result.topFlaw.metric, side)[0], [result.topFlaw.metric, side]);
  const flawKeys = useMemo(() => (flawJoint ? flawConnectionKeys(flawJoint) : new Set<string>()), [flawJoint]);

  // Auto-fit: center the figure and scale it to fill the frame (stable across
  // frames so it doesn't jump), using the bounding box of all user + ghost poses.
  const fit = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const consider = (kps: { x: number; y: number; score?: number }[]) => {
      for (const k of kps) {
        if (!isVisible(k)) continue;
        const x = k.x * width;
        const y = k.y * height;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    };
    for (const f of frames) consider(f.keypoints);
    for (const g of result.ghostRef) consider(g.keypoints);
    if (!Number.isFinite(minX)) return { s: 1, cx: width / 2, cy: height / 2 };
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    // Scale the body to ~80% of canvas height (and never wider than the canvas),
    // then center it. Same transform is applied to both you and the ghost.
    const s = Math.max(0.9, Math.min(2.8, Math.min((width * 0.78) / bw, (height * 0.8) / bh)));
    return { s, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }, [frames, result.ghostRef, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);

    const offCanvas = document.createElement("canvas");
    offCanvas.width = width * dpr;
    offCanvas.height = height * dpr;
    const offCtx = offCanvas.getContext("2d");
    if (offCtx) {
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offRef.current = { canvas: offCanvas, ctx: offCtx };
    }
  }, [width, height]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const start = last;
    let acc = 0;
    const frameDur = 1000 / fps;

    const draw = (i: number, now: number) => {
      ctx.clearRect(0, 0, width, height);
      drawBackdrop(ctx, width, height);
      const intro = reduced ? 1 : easeOutCubic(Math.min(1, (now - start) / 650));
      const ghost = result.ghostRef[i];
      const user = frames[i];
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(fit.s, fit.s);
      ctx.translate(-fit.cx, -fit.cy);
      if (ghost && offRef.current) drawGhostSilhouette(ctx, offRef.current, ghost, width, height, intro);
      if (user) {
        drawPlayerSkeleton(ctx, user, width, height, flawKeys);
        if (ghost && flawJoint) {
          const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 450);
          drawDeviation(ctx, user, ghost, width, height, flawJoint, pulse);
        }
      }
      ctx.restore();
      drawVignette(ctx, width, height);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (playingRef.current) {
        acc += dt;
        while (acc >= frameDur) {
          acc -= frameDur;
          if (indexRef.current >= total - 1) {
            playingRef.current = false;
            setPlaying(false);
            acc = 0;
            break;
          }
          indexRef.current += 1;
          setIndex(indexRef.current);
        }
      }
      draw(indexRef.current, now);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, frames, total, fps, flawKeys, flawJoint, fit, width, height]);

  const atEnd = index >= total - 1;
  const isReleaseFrame = index === result.metrics.releaseFrameIndex;
  const releasePct = total > 1 ? (releaseIndex / (total - 1)) * 100 : 0;

  return (
    <div className={className} style={{ width }}>
      <div className="relative overflow-hidden rounded-2xl" style={{ width, height, boxShadow: "0 0 0 1px #232A33, 0 20px 60px -20px rgba(0,0,0,0.8)" }}>
        <canvas ref={canvasRef} className="block" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3.5">
          <span className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8B93A0]" style={{ background: "rgba(255,255,255,0.04)" }}>
            Form × Ghost
          </span>
          {isReleaseFrame && (
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0E1116]" style={{ background: "#4FD6E0" }}>
              Release
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (atEnd) {
              setIndex(0);
              indexRef.current = 0;
            }
            setPlaying((p) => !p);
          }}
          className="grid size-9 shrink-0 place-items-center rounded-full text-[#0E1116] transition hover:brightness-110"
          style={{ background: "#4FD6E0" }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : atEnd ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
        </button>

        <div className="relative flex-1">
          <div
            className="pointer-events-none absolute top-1/2 z-10 h-3 w-px -translate-y-1/2"
            style={{ left: `${releasePct}%`, background: "#4FD6E0", boxShadow: "0 0 6px #4FD6E0" }}
            title="Release frame"
          />
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              let v = Number(e.target.value);
              if (Math.abs(v - releaseIndex) <= 1) v = releaseIndex;
              setIndex(v);
              indexRef.current = v;
            }}
            aria-label="Scrub shot"
            className="w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#232A33] [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F2F0E9] [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[#232A33] [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#F2F0E9]"
          />
        </div>

        <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-[#8B93A0]">
          {String(index + 1).padStart(2, "0")}/{total}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#8B93A0]">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "#F2F0E9" }} /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "#4FD6E0", boxShadow: "0 0 8px 2px rgba(79,214,224,0.6)" }} /> Ideal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ border: "2px solid #FF6B4A" }} /> {result.topFlaw.label}
        </span>
      </div>
    </div>
  );
}
