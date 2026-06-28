"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { CaptureView } from "@/components/capture/CaptureView";
import { GhostOverlay } from "@/components/overlay";
import { ResultsView } from "@/components/results";
import { mockShotCapture } from "@/lib/core";
import type {
  AnalysisResult,
  CoachingResult,
  ShotCapture,
} from "@/lib/contracts";

import { SaveSessionButton } from "../results/save-session-button";
import { analyzeAndCoach } from "./actions";

export function CaptureStage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [error, setError] = useState<string>();

  async function handleCapture(capture: ShotCapture) {
    setAnalyzing(true);
    setError(undefined);
    try {
      const result = await analyzeAndCoach(capture);
      setAnalysis(result.analysis);
      setCoaching(result.coaching);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not analyze that shot. Try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setAnalysis(null);
    setCoaching(null);
    setError(undefined);
  }

  if (analysis && coaching) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">Analysis complete</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Your shot, decoded.
          </h2>
        </div>
        <ResultsView
          analysis={analysis}
          coaching={coaching}
          ghostOverlay={<GhostOverlay result={analysis} />}
          saveAction={
            <SaveSessionButton analysis={analysis} coaching={coaching} />
          }
        />
        <button
          className="text-sm text-muted-foreground underline hover:text-foreground"
          onClick={reset}
          type="button"
        >
          Record another shot
        </button>
      </div>
    );
  }

  // While the server analyzes, unmount the camera so it can't auto-start a
  // second countdown mid-request.
  if (analyzing) {
    return (
      <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-white/10 bg-[#080c14] text-white/70">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your shot…
        </p>
      </div>
    );
  }

  return (
    <div>
      <CaptureView onCapture={handleCapture} />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <button
        className="mt-4 text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
        onClick={() => handleCapture(mockShotCapture)}
        disabled={analyzing}
        type="button"
      >
        Camera not working? Analyze a sample shot instead
      </button>
    </div>
  );
}
