# Ghost — Wizard Hackathon Submission

## Project

- **Track:** Sports Arena
- **Live demo:** <https://ghost-form-coach.vercel.app>
- **Repository:** <https://github.com/Ranj04/Ghost>
- **FinChip asset:** `src/lib/finchip/ghost-shot-coach/`
- **FinChip slug:** `ghost-shot-coach_finchip`

### One-line pitch

Ghost films a basketball shot, finds the single form flaw that matters most,
shows the gap against an aligned reference pose, and returns one source-cited
drill to correct it.

## Demo path

1. Open **Analyze** and record a side-view shot, or use the sample capture.
2. Review the form score, highest-priority flaw, reference overlay, and cited
   corrective drill.
3. Save the session and open **History** to see score-over-time and recurring
   flaws.
4. Optionally open **Battle** to compare two shots scored by the same analyzer.
   The Kite receipt is visibly simulated and uses test tokens only.

## Eight-tool sponsor and partner map

| Tool | Where Ghost uses it | Submission status |
| --- | --- | --- |
| **You.com** | Flaw-specific drill retrieval in the coaching pipeline (`src/lib/coach/`). | Core contract and product path defined; final live retrieval depends on Person A’s coaching phase and a configured API key. |
| **Tavily** | Supporting technique/biomechanics sources for the coaching references list (`src/lib/coach/`). | Product path defined; final live retrieval depends on Person A’s coaching phase and credentials. |
| **Nebius** | Token Factory writes the grounded coaching note. The optional GPU reference-builder was evaluated separately. | Token Factory path is part of coaching integration. GPU builder was not run because credentials were unavailable; the demo honestly uses the curated reference. |
| **InsForge** | Email/password auth, per-user session persistence, score history, and flaw recurrence (`src/lib/db/`, `src/app/auth/`, `src/app/history/`). | SDK integration and RLS migration complete. The public deployment clearly uses local-demo storage until project URL and anon-key credentials are configured. |
| **Kite** | Agent identities, user-set spending limits, and x402 settlement boundary for Form Battle (`src/lib/payments/`, `src/app/battle/`). | **Labeled simulation.** No funded/passkey-approved Passport session exists, so no on-chain transaction or tx hash is claimed. |
| **FinChip** | Packages `coachFlaw` as a reusable ERC-1155 skill asset with manifest, metadata, schemas, guardrails, and content hash (`src/lib/finchip/ghost-shot-coach/`). | Package-ready and locally validated against FinChip CLI v0.3.1’s `chip.json` format. Not minted: no `fc_key`, registered wallet, chain funds, or Pinata credential was available. |
| **Trae / Replit** | Build-workflow attribution and hackathon development environments. Vercel hosts the production frontend. | Built-with tooling, not presented as a runtime product integration. |
| **Growing Pines** | Overall winning-project prize eligibility. | No API or SDK exists to integrate; eligibility comes from submitting the complete project. |

## FinChip asset details

The asset packages the capability:

> Given a measured basketball form flaw, return one plain-language correction
> and one actionable, source-cited drill.

- Token standard: ERC-1155
- License: MIT
- Price: free
- Supply: unlimited
- Royalty: 2.5%
- Typed input: Ghost `Flaw`
- Typed output: Ghost `CoachingResult`
- Content hash: SHA-256 of `SKILL.md`
- CLI launch command after wallet/IPFS setup:
  `finchip launch src/lib/finchip/ghost-shot-coach`

Local package verification:

```bash
node src/lib/finchip/ghost-shot-coach/validate-package.mjs
```

## Architecture and safety

- Pose capture and analysis run in the browser for demo reliability.
- Feedback is directional, not a claim of clinical 3D biomechanical precision.
- Coaching output must cite its drill source and cannot invent references.
- The ghost is a curated exemplar, not a universal definition of perfect form.
- Form Battle is a skill challenge with test tokens, not real-money gambling.
- Kite settlement is simulated and displays no transaction hash.

## Current credential-dependent limits

The repository includes production-shaped boundaries for InsForge, Kite,
FinChip, You.com, Tavily, and Nebius. The public demo does not claim successful
external operations when credentials or approved sessions are absent. Configure
the documented environment variables before claiming cloud persistence,
retrieval/generation, on-chain settlement, or FinChip minting.

## Growing Pines note

Ghost is submitted for Growing Pines overall-prize eligibility. Growing Pines
has no technical integration requirement; this document, the live demo, and the
repository constitute the complete project submission.
