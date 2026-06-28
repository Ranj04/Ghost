"use client";
// Webcam view with a live MediaPipe pose skeleton drawn on an overlay canvas.
// Recording buffers PoseFrames; stopping assembles a contract-valid ShotCapture
// and hands it back via onCapture.
import { useCallback, useEffect, useRef, useState } from "react";
import { DrawingUtils, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/lib/vision/useCamera";
import { createPoseLandmarker } from "@/lib/vision/poseLandmarker";
import { landmarksToKeypoints } from "@/lib/vision/landmarks";
import { buildCapture } from "@/lib/vision/buildCapture";
import type { PoseFrame, ShotCapture } from "@/lib/contracts";

export interface CaptureViewProps {
  onCapture?: (capture: ShotCapture) => void;
  className?: string;
}

export function CaptureView({ onCapture, className }: CaptureViewProps) {
  const { videoRef, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const drawingRef = useRef<DrawingUtils | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const bufferRef = useRef<PoseFrame[]>([]);
  const recordStartRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;
    if (!video || !canvas || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    if (!drawingRef.current) drawingRef.current = new DrawingUtils(ctx);

    const nowMs = performance.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = lm.detectForVideo(video, nowMs);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const landmarks = result.landmarks?.[0] as NormalizedLandmark[] | undefined;
      if (landmarks) {
        drawingRef.current.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: "#22d3ee",
          lineWidth: 3,
        });
        drawingRef.current.drawLandmarks(landmarks, { color: "#f43f5e", radius: 3 });
        if (recordingRef.current) {
          bufferRef.current.push({
            t: nowMs - recordStartRef.current,
            keypoints: landmarksToKeypoints(landmarks),
          });
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef]);

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

  // Drive the detection loop once ready.
  useEffect(() => {
    if (!ready) return;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, loop]);

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
