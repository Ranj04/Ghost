import { analyzeShot as realAnalyzeShot } from "@/lib/analysis";
import { coachFlaw as realCoachFlaw } from "@/lib/coach";
import { mockShotCapture } from "@/lib/__mocks__/analyzeShot";

// Single integration switch: now wired to Person A's real core (analysis + coach).
// mockShotCapture remains as the demo/fallback sample ShotCapture input.
export const analyzeShot = realAnalyzeShot;
export const coachFlaw = realCoachFlaw;
export { mockShotCapture };
