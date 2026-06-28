/**
 * Analysis verify harness — the gate Person A codes against.
 *
 * Run:  npx tsx src/lib/__verify__/checkAnalysis.ts
 *
 * It validates the fixtures against the frozen Zod contracts, then runs whatever
 * `analyzeShot` exists (exported from src/lib/analysis) against the injected-flaw
 * sample and asserts the detected top flaw + release frame match ground truth.
 *
 * Until Person A implements `analyzeShot` (Phase A3), this exits with a clear
 * "gate pending" message and a non-zero code — that's expected, not a failure of
 * this harness. Exit codes: 0 = pass, 1 = gate pending, 2 = fixtures invalid.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ShotCaptureSchema, PoseFrameSchema, AnalysisResultSchema } from "../contracts";
import { z } from "zod";
import * as analysis from "../analysis";

const root = process.cwd();
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));

const GroundTruthSchema = z.object({
  topFlawId: z.string(),
  releaseFrameIndex: z.number().int(),
  releaseTolerance: z.number().int(),
  note: z.string().optional(),
});

function validateFixtures() {
  const sample = ShotCaptureSchema.parse(readJson("fixtures/sample-shot.json"));
  const reference = z.array(PoseFrameSchema).parse(readJson("fixtures/reference/good-form.json"));
  const truth = GroundTruthSchema.parse(readJson("fixtures/ground-truth.json"));
  console.log(
    `✓ fixtures valid against contracts — sample: ${sample.frames.length} frames, ` +
      `reference: ${reference.length} frames, expected flaw: ${truth.topFlawId} @ release ${truth.releaseFrameIndex}`,
  );
  return { sample, truth };
}

async function main() {
  let sample: z.infer<typeof ShotCaptureSchema>;
  let truth: z.infer<typeof GroundTruthSchema>;
  try {
    ({ sample, truth } = validateFixtures());
  } catch (err) {
    console.error("✗ fixtures do NOT parse against contracts:");
    console.error(err);
    process.exit(2);
  }

  // analyzeShot may not exist yet — look it up dynamically so this file always compiles.
  const analyzeShot = (analysis as Record<string, unknown>).analyzeShot;
  if (typeof analyzeShot !== "function") {
    console.log("⏳ gate pending: analyzeShot is not implemented yet (expected until Phase A3).");
    process.exit(1);
  }

  const result = AnalysisResultSchema.parse(await (analyzeShot as (c: typeof sample) => Promise<unknown>)(sample));
  const releaseDelta = Math.abs(result.metrics.releaseFrameIndex! - truth.releaseFrameIndex);
  const flawOk = result.topFlaw.id === truth.topFlawId;
  const releaseOk = result.metrics.releaseFrameIndex != null && releaseDelta <= truth.releaseTolerance;

  console.log(`  metrics:`, result.metrics);
  console.log(`  topFlaw: ${result.topFlaw.id} (expected ${truth.topFlawId}) — ${flawOk ? "OK" : "MISMATCH"}`);
  console.log(`  release: ${result.metrics.releaseFrameIndex} (expected ~${truth.releaseFrameIndex}, ±${truth.releaseTolerance}) — ${releaseOk ? "OK" : "MISMATCH"}`);

  if (flawOk && releaseOk) {
    console.log("✓ analysis gate PASSED");
    process.exit(0);
  }
  console.error("✗ analysis gate FAILED");
  process.exit(1);
}

main();
