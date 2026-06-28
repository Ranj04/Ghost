"use client";
// Webcam view with a live MediaPipe pose skeleton drawn on an overlay canvas.
// Recording buffers PoseFrames; stopping assembles a contract-valid ShotCapture
// and hands it back via onCapture.
import { useCallback, useEffect, useRef, useState } from "react";
import { PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/lib/vision/useCamera";
import { createPoseLandmarker } from "@/lib/vision/poseLandmarker";
import { landmarksToKeypoints } from "@/lib/vision/landmarks";
import { buildCapture } from "@/lib/vision/buildCapture";
import { isVisible } from "@/lib/vision/visibility";
import type { PoseFrame, ShotCapture } from "@/lib/contracts";

export interface CaptureViewProps {
  onCapture?: (capture: ShotCapture) => void;
  className?: string;
}

const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS as { start: number; end: number }[];
const DEBUG_VISIBILITY = false;

/** Draw the live preview skeleton — gated: only confidently-seen joints/bones. */
function drawGatedPreview(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(242, 240, 233, 0.9)";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(242, 240, 233, 0.35)";
  ctx.shadowBlur = 4;
  for (const c of POSE_CONNECTIONS) {
    const a = landmarks[c.start];
    const b = landmarks[c.end];
    if (a && b && isVisible(a) && isVisible(b)) {
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#F2F0E9";
  for (const p of landmarks) {
    if (isVisible(p)) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function CaptureView({ onCapture, className }: CaptureViewProps) {
  const { videoRef, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const bufferRef = useRef<PoseFrame[]>([]);
  const recordStartRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize camera + pose model once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await start();
        const lm = await createPoseLandmarker();
        if (cancelled) return;
        landmarkerRef.current = lm;
        setReady(true);
      } catch (e) {
        setInitError(e instanceof Error ? e.message : "Failed to initialize pose tracking");
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stop();
    };
    // start/stop are stable from useCamera; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive the detection loop once ready. Defined locally so it can recurse via
  // requestAnimationFrame without a self-referential useCallback.
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      rafRef.current = raf;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lm = landmarkerRef.current;
      if (!video || !canvas || !lm || video.readyState < 2) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const nowMs = performance.now();
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = lm.detectForVideo(video, nowMs);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const landmarks = result.landmarks?.[0] as NormalizedLandmark[] | undefined;
        if (landmarks) {
          drawGatedPreview(ctx, landmarks, canvas.width, canvas.height);
          if (DEBUG_VISIBILITY) {
            const n = landmarks.filter((p) => isVisible(p)).length;
            console.debug(`${n}/${landmarks.length} landmarks visible`);
          }
          if (recordingRef.current) {
            bufferRef.current.push({
              t: nowMs - recordStartRef.current,
              keypoints: landmarksToKeypoints(landmarks),
            });
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, videoRef]);

  const toggleRecording = useCallback(() => {
    if (recordingRef.current) {
      recordingRef.current = false;
      setRecording(false);
      const capture = buildCapture(bufferRef.current, { view: "side" });
      onCapture?.(capture);
    } else {
      bufferRef.current = [];
      recordStartRef.current = performance.now();
      recordingRef.current = true;
      setRecording(true);
    }
  }, [onCapture]);

  return (
    <div className={className}>
      <div className="relative w-full overflow-hidden rounded-lg bg-black">
        {/* Mirror both layers so the selfie view and skeleton stay aligned. */}
        <video ref={videoRef} className="w-full -scale-x-100" playsInline muted />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" />
        {recording && (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC
          </span>
        )}
      </div>
      {(error || initError) && <p className="mt-2 text-sm text-red-500">{error ?? initError}</p>}
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={toggleRecording} disabled={!ready} variant={recording ? "destructive" : "default"}>
          {recording ? "Stop & analyze" : "Record shot"}
        </Button>
        {!ready && !initError && <span className="text-sm text-muted-foreground">Starting camera…</span>}
      </div>
    </div>
  );
}
