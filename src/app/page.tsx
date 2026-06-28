import { ArrowRight, Crosshair, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="relative isolate flex flex-1 overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <section>
          <Badge
            variant="outline"
            className="h-7 border-black/10 bg-white/70 px-3 backdrop-blur"
          >
            <Sparkles className="text-[#799600]" />
            AI basketball form coach
          </Badge>
          <h1 className="mt-7 max-w-3xl text-6xl font-semibold leading-[0.95] tracking-[-0.065em] sm:text-7xl">
            See the shot
            <br />
            <span className="text-[#799600]">you can’t feel.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
            Ghost turns one video into measured mechanics, a visual reference,
            and one cited drill to fix what matters most.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              className={cn(
                buttonVariants(),
                "h-12 rounded-full bg-[#101513] px-6 text-white hover:bg-[#26302c]",
              )}
              href="/capture"
            >
              Analyze your shot
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 rounded-full bg-white/60 px-6",
              )}
              href="/results"
            >
              View sample
            </Link>
          </div>
          <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="flex items-center gap-2">
              <ScanLine className="size-4 text-[#799600]" />
              Pose tracked
            </span>
            <span className="flex items-center gap-2">
              <Crosshair className="size-4 text-[#799600]" />
              Reference aligned
            </span>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-8 -z-10 rounded-full bg-[#d9ff43]/20 blur-3xl" />
          <div className="rotate-2 rounded-[2.2rem] border border-white/10 bg-[#101513] p-3 shadow-2xl shadow-black/20">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.65rem] bg-[#181e1b]">
              <div className="capture-grid absolute inset-0 opacity-20" />
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
                <span className="size-2 rounded-full bg-red-400" />
                Shot 01 · side view
              </div>
              <div className="absolute inset-x-[31%] top-[18%] h-[60%]">
                <div className="absolute left-[42%] top-0 size-14 rounded-full border-2 border-[#d9ff43] bg-[#d9ff43]/10" />
                <div className="absolute left-1/2 top-[13%] h-[42%] w-0.5 -translate-x-1/2 rotate-3 bg-[#d9ff43]" />
                <div className="absolute left-[26%] top-[21%] h-0.5 w-[55%] rotate-[-25deg] bg-[#d9ff43]" />
                <div className="absolute left-[49%] top-[54%] h-[44%] w-0.5 rotate-[18deg] bg-[#d9ff43]" />
                <div className="absolute left-[49%] top-[54%] h-[44%] w-0.5 rotate-[-22deg] bg-[#d9ff43]" />
              </div>
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-black/45 p-4 text-white backdrop-blur">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-xs text-white/45">
                      Live form score
                    </span>
                    <strong className="mt-1 block text-4xl font-semibold">
                      78
                    </strong>
                  </div>
                  <Badge className="bg-[#d9ff43] text-[#10130b]">
                    Elbow flare
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
