# Ownership Map

Two people build Ghost in parallel off `main`. Stay inside your folders.
Anything under **SHARED — FROZEN** requires a NOTIFY PARTNER gate before editing.

```
PERSON A (Ranjiv) — branch feat/vision-core — owns:
  src/lib/vision/**      (pose capture, release detection)
  src/lib/analysis/**    (metrics, reference alignment, flaw detection, scoring)
  src/lib/coach/**       (You.com + Tavily retrieval)
  src/components/capture/**
  src/components/overlay/**

PERSON B (Partner) — branch feat/platform — owns:
  src/app/**             (routing, pages, layout)
  src/lib/db/**          (InsForge auth + persistence)
  src/lib/payments/**    (Kite PvP stake)
  src/lib/deploy/**      (Nebius)
  src/lib/finchip/**     (submission packaging)
  src/components/ui/**   (shadcn + shared UI)
  src/components/results/**  (results + progress views)

SHARED — FROZEN — changes require a NOTIFY PARTNER gate:
  src/lib/contracts.ts
  OWNERSHIP.md
  docs/ARCHITECTURE.md (sponsor table only)
```
