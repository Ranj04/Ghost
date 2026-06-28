import { BarChart3, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 place-items-center px-5 py-14 sm:px-8">
      <Card className="w-full max-w-2xl border-0 py-12 text-center ring-black/8">
        <CardContent className="flex flex-col items-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#efffb6] text-[#526500]">
            <BarChart3 className="size-7" />
          </div>
          <p className="eyebrow mt-6">Progress history</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Make every rep compound.
          </h1>
          <p className="mt-3 max-w-md leading-7 text-muted-foreground">
            Account-backed session history and score trends arrive in the next
            platform phase. Your sample analysis is ready to review again.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" />
            Sign-in and persistence coming in Phase B2
          </div>
          <Link
            className={cn(buttonVariants(), "mt-7 h-11 px-5")}
            href="/results"
          >
            Return to results
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
