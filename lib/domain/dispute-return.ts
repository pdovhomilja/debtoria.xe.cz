import type { CaseStatus } from "@prisma/client";
import { transitions } from "@/lib/domain/case-machine";

// Where a case returns to once its dispute is resolved: the state it was in
// immediately before the state_change event that moved it TO DISPUTED. If no
// such event exists, or the recovered state is no longer a legal transition
// from DISPUTED (case-machine drifted since), fall back to IN_COLLECTION.
const FALLBACK: CaseStatus = "IN_COLLECTION";

export interface StateChangeEvent {
  type: string;
  fromState?: CaseStatus | null;
  toState?: CaseStatus | null;
}

export function resolveReturnState(events: StateChangeEvent[]): CaseStatus {
  const toDisputed = [...events]
    .reverse()
    .find((e) => e.type === "state_change" && e.toState === "DISPUTED");

  const priorState = toDisputed?.fromState;
  if (!priorState) return FALLBACK;
  if (!transitions.DISPUTED.includes(priorState)) return FALLBACK;
  return priorState;
}
