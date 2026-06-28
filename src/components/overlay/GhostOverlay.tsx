"use client";
// Cinematic "form vs ghost" overlay: the athlete and the translucent reference
// ghost rendered as human SILHOUETTES on a depth-gradient stage, with a pulsing
// marker on the flawed joint, a scrub slider, and play/pause. A single
// requestAnimationFrame loop drives the pulse and playback. Silhouettes are
// composited via an offscreen buffer (see skeleton.ts) for clean union shapes.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { detectShootingSide } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/contracts";
import {
  drawAthleteFigure,
  drawBackdrop,
  drawGhostFigure,
  drawHighlight,
  jointsForFlaw,
  type Offscreen,
} from "./skeleton";

export interface GhostOverlayProps {
  result: AnalysisResult;
  width?: number;
  height?: number;
  className?: string;
}

const FLAW_COLOR = "#fbbf24"; // amber marker on the flawed joint

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
  const highlightJoints = useMemo(() => jointsForFlaw(result.topFlaw.metric, side), [result.topFlaw.metric, side]);

  // Crisp retina main canvas + matching offscreen buffer.
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

  // Single render + playback loop.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frameDur = 1000 / fps;

    const draw = (i: number, now: number) => {
      const off = offRef.current;
      ctx.clearRect(0, 0, width, height);
      drawBackdrop(ctx, width, height);
      const ghost = result.ghostRef[i];
      if (ghost && off) drawGhostFigure(ctx, off, ghost, width, height);
      const user = frames[i];
      if (user && off) {
        drawAthleteFigure(ctx, off, user, width, height);
        if (highlightJoints.length) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 450);
          drawHighlight(ctx, user, highlightJoints, width, height, FLAW_COLOR, pulse);
        }
      }
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
  }, [result, frames, total, fps, highlightJoints, width, height]);

  const atEnd = index >= total - 1;
  const isReleaseFrame = index === result.metrics.releaseFrameIndex;

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ width, height }}>
        <canvas ref={canvasRef} className="block" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur">
            FORM × GHOST
          </span>
          {isReleaseFrame && (
            <span className="rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-semibold text-black">RELEASE</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3" style={{ width }}>
        <button
          type="button"
          onClick={() => {
            if (atEnd) {
              setIndex(0);
              indexRef.current = 0;
            }
            setPlaying((p) => !p);
          }}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-400 text-black transition hover:bg-cyan-300"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : atEnd ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            const v = Number(e.target.value);
            setIndex(v);
            indexRef.current = v;
          }}
          className="h-1.5 flex-1 cursor-pointer accent-cyan-400"
          aria-label="Scrub shot"
        />
        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {index + 1}/{total}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" style={{ maxWidth: width }}>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.7)]" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sky-100/80 shadow-[0_0_8px_2px_rgba(186,224,255,0.7)]" /> Ghost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-amber-400" /> {result.topFlaw.label}
        </span>
      </div>
    </div>
  );
}
