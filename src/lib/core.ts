import {
  analyzeShot as mockAnalyzeShot,
  coachFlaw as mockCoachFlaw,
  mockShotCapture,
} from "@/lib/__mocks__/analyzeShot";

// Single integration switch: replace this mock module with Person A's real core
// when the upstream entry point is ready.
export const analyzeShot = mockAnalyzeShot;
export const coachFlaw = mockCoachFlaw;
export { mockShotCapture };
