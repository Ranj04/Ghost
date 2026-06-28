// Confidence gating. MediaPipe emits low-confidence / off-frame landmarks when a
// joint isn't actually seen (e.g. legs out of frame). We must never draw or trust
// those — gate on visibility/presence AND in-frame position.
//
// Pure module (no client/runtime deps) so it's safe to import anywhere — capture
// preview, overlay, and node verify scripts.

export const VISIBILITY_THRESHOLD = 0.5;

/** Anything with normalized coords plus a confidence signal. Raw MediaPipe
 *  landmarks carry `visibility`/`presence`; our Keypoint contract carries `score`
 *  (which we set from visibility at capture time). */
export interface ScorableLandmark {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
  score?: number;
}

/** True only if the landmark is confidently seen AND inside the frame. */
export function isVisible(lm: ScorableLandmark): boolean {
  const visibility = lm.visibility ?? lm.score ?? 1;
  const presence = lm.presence ?? 1;
  return (
    visibility >= VISIBILITY_THRESHOLD &&
    presence >= VISIBILITY_THRESHOLD &&
    lm.x >= 0 &&
    lm.x <= 1 &&
    lm.y >= 0 &&
    lm.y <= 1
  );
}

/** How many of a set of landmarks are visible (for the "N/33" debug readout). */
export function countVisible(landmarks: ScorableLandmark[]): number {
  let n = 0;
  for (const lm of landmarks) if (isVisible(lm)) n++;
  return n;
}
