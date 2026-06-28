"use client";
// Renders the user's skeleton and the aligned reference "ghost" on one canvas,
// with the flawed joint highlighted, plus a scrub slider + play/pause to step
// through the shot frame by frame.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { detectShootingSide } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/contracts";
import { drawHighlight, drawSkeleton, jointsForFlaw } from "./skeleton";

export interface GhostOverlayProps {
  result: AnalysisResult;
  width?: number;
  height?: number;
  className?: string;
}

const USER_COLOR = "#22d3ee"; // cyan — you
const GHOST_COLOR = "#94a3b8"; // slate, dashed — the reference ghost
const FLAW_COLOR = "#f59e0b"; // amber ring on the flawed joint

export function GhostOverlay({ result, width = 480, height = 600, className }: GhostOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frames = result.capture.frames;
  const total = frames.length;

  const [index, setIndex] = useState(() => Math.min(result.metrics.releaseFrameIndex ?? 0, total - 1));
  const [playing, setPlaying] = useState(false);

  const side = useMemo(() => detectShootingSide(result.capture), [result.capture]);
  const highlightJoints = useMemo(
    () => jointsForFlaw(result.topFlaw.metric, side),
    [result.topFlaw.metric, side],
  );

  // Draw the current frame: ghost first (behind), then user, then the flaw ring.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const ghost = result.ghostRef[index];
    if (ghost) drawSkeleton(ctx, ghost, width, height, { color: GHOST_COLOR, lineWidth: 3, radius: 3, dashed: true });

    const user = frames[index];
    if (user) {
      drawSkeleton(ctx, user, width, height, { color: USER_COLOR, lineWidth: 3, radius: 4 });
      if (highlightJoints.length) drawHighlight(ctx, user, highlightJoints, width, height, FLAW_COLOR);
    }
  }, [index, result, frames, highlightJoints, width, height]);

  // Playback: advance at the capture's fps, stop at the end.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= total - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1000 / Math.max(1, result.capture.fps));
    return () => clearInterval(id);
  }, [playing, total, result.capture.fps]);

  const atEnd = index >= total - 1;
  const isReleaseFrame = index === result.metrics.releaseFrameIndex;

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-lg bg-slate-950" style={{ width, height }}>
        <canvas ref={canvasRef} width={width} height={height} className="h-full w-full" />
        {isReleaseFrame && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-black">
            release
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (atEnd) setIndex(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : atEnd ? "Replay" : "Play"}
        </Button>
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
          className="flex-1 accent-cyan-400"
          aria-label="Scrub shot"
        />
        <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
          {index + 1}/{total}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: USER_COLOR }} /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm border border-dashed" style={{ borderColor: GHOST_COLOR }} /> Ghost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: FLAW_COLOR }} />
          {result.topFlaw.label}
        </span>
      </div>
    </div>
  );
}
