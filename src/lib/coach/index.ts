// PERSON A (works on main) — coach module public surface. See OWNERSHIP.md.
// Server-only: coachFlaw reads API keys from the environment.
export { coachFlaw, lastCoachSource, clearCoachCache, type CoachSource } from "./coachFlaw";
export { buildQuery } from "./queries";
export { nebiusInfo } from "./nebius";
