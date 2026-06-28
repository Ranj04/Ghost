"use client";

import { Camera, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import type { ShotCapture } from "@/lib/contracts";

export interface CaptureViewProps {
  onComplete: (capture: ShotCapture) => void;
}

export interface CaptureStageProps {
  CaptureView?: ComponentType<CaptureViewProps>;
}

function CapturePlaceholder({}: CaptureViewProps) {
  const router = useRouter();

  return (
    <div className="relative grid min-h-[31rem] place-items-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#080c14]">
      <div className="capture-grid absolute inset-0 opacity-30" />
      <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur">
        <span className="size-2 rounded-full bg-[#2e86ff] shadow-[0_0_12px_#2e86ff]" />
        Camera ready
      </div>
      <div className="absolute inset-x-[24%] inset-y-[12%] rounded-[45%_45%_25%_25%] border border-dashed border-[#2e86ff]/40" />
      <div className="relative z-10 flex max-w-sm flex-col items-center px-8 text-center">
        <div className="mb-6 grid size-16 place-items-center rounded-2xl border border-[#2e86ff]/20 bg-[#2e86ff]/10 text-[#2e86ff]">
          <ScanLine className="size-8" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Capture view plugs in here
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Stand side-on with your full body in frame. For now, run the sample
          shot to preview the complete analysis flow.
        </p>
        <Button
          className="mt-7 h-11 rounded-full bg-[#2e86ff] px-5 text-[#f4f1e8] hover:bg-[#5aa0ff]"
          onClick={() => router.push("/results")}
        >
          <Camera data-icon="inline-start" />
          Analyze sample shot
        </Button>
      </div>
    </div>
  );
}

export function CaptureStage({
  CaptureView = CapturePlaceholder,
}: CaptureStageProps) {
  const router = useRouter();

  return (
    <CaptureView
      onComplete={() => {
        router.push("/results");
      }}
    />
  );
}
