// Pure assembly of buffered pose frames into a contract-valid ShotCapture.
// Kept side-effect-free so it can be unit-verified against the Zod schema
// without a camera.
import type { PoseFrame, ShotCapture, View } from "../contracts";

export interface BuildCaptureOptions {
  id?: string;
  view?: View;
  fps?: number;
}

/** Estimate fps from frame timestamps (ms), defaulting to 30 when undeterminable. */
export function estimateFps(frames: PoseFrame[]): number {
  if (frames.length < 2) return 30;
  const spanMs = frames[frames.length - 1].t - frames[0].t;
  if (spanMs <= 0) return 30;
  return Math.round(((frames.length - 1) / spanMs) * 1000);
}

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return c?.randomUUID ? c.randomUUID() : `shot-${Date.now()}`;
}

/** Wrap recorded `PoseFrame[]` into a `ShotCapture` (side-on view by default). */
export function buildCapture(frames: PoseFrame[], options: BuildCaptureOptions = {}): ShotCapture {
  return {
    id: options.id ?? newId(),
    frames,
    fps: options.fps ?? estimateFps(frames),
    view: options.view ?? "side",
  };
}
