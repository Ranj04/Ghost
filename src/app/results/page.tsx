import { ResultsView } from "@/components/results";
import { GhostOverlay } from "@/components/overlay";
import { analyzeShot, coachFlaw, mockShotCapture } from "@/lib/core";

import { SaveSessionButton } from "./save-session-button";

export default async function ResultsPage() {
  const analysis = await analyzeShot(mockShotCapture);
  const coaching = await coachFlaw(analysis.topFlaw);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8">
        <p className="eyebrow">Analysis complete</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Your shot, decoded.
        </h1>
      </div>
      <ResultsView
        analysis={analysis}
        coaching={coaching}
        ghostOverlay={<GhostOverlay result={analysis} />}
        saveAction={
          <SaveSessionButton analysis={analysis} coaching={coaching} />
        }
      />
    </main>
  );
}
