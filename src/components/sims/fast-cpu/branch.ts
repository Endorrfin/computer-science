// Engine — branch predictors. Pure & erasable-syntax (Node-testable).
// Drives the branch-predictor figure (ch.8) and the pattern intuition behind
// the pipeline's flush penalty.
//
// The 2-bit saturating counter is the canonical dynamic predictor: four states
//   0 strong-NT · 1 weak-NT · 2 weak-T · 3 strong-T
// predict "taken" when the counter is in the top half (≥ 2); each outcome nudges
// the counter toward that direction, saturating at the ends. Its virtue over a
// 1-bit predictor: a single anomaly (the one not-taken at the end of a loop)
// costs one misprediction, not two, because the counter must be wrong twice to
// flip its prediction.

export type Bit2State = 0 | 1 | 2 | 3;

export const BIT2_LABELS: Record<Bit2State, string> = {
  0: "strong ¬taken",
  1: "weak ¬taken",
  2: "weak taken",
  3: "strong taken",
};

export function predict2(state: Bit2State): boolean {
  return state >= 2; // top half ⇒ predict taken
}

export function update2(state: Bit2State, taken: boolean): Bit2State {
  if (taken) return Math.min(3, state + 1) as Bit2State;
  return Math.max(0, state - 1) as Bit2State;
}

export function predict1(state: boolean): boolean {
  return state; // 1-bit: predict whatever happened last time
}
export function update1(_state: boolean, taken: boolean): boolean {
  return taken;
}

export type PredictStep = {
  index: number;
  before: number; // state before the outcome (number so 1-bit=0/1, 2-bit=0..3)
  prediction: boolean;
  actual: boolean;
  correct: boolean;
  after: number;
};
export type PredictRun = { steps: PredictStep[]; mispredicts: number; accuracy: number };

export function run2bit(outcomes: boolean[], init: Bit2State = 1): PredictRun {
  let state: Bit2State = init;
  const steps: PredictStep[] = [];
  let mispredicts = 0;
  outcomes.forEach((actual, index) => {
    const prediction = predict2(state);
    const correct = prediction === actual;
    if (!correct) mispredicts++;
    const before = state;
    state = update2(state, actual);
    steps.push({ index, before, prediction, actual, correct, after: state });
  });
  return { steps, mispredicts, accuracy: outcomes.length === 0 ? 1 : (outcomes.length - mispredicts) / outcomes.length };
}

export function run1bit(outcomes: boolean[], init = false): PredictRun {
  let state = init;
  const steps: PredictStep[] = [];
  let mispredicts = 0;
  outcomes.forEach((actual, index) => {
    const prediction = predict1(state);
    const correct = prediction === actual;
    if (!correct) mispredicts++;
    const before = state ? 1 : 0;
    state = update1(state, actual);
    steps.push({ index, before, prediction, actual, correct, after: state ? 1 : 0 });
  });
  return { steps, mispredicts, accuracy: outcomes.length === 0 ? 1 : (outcomes.length - mispredicts) / outcomes.length };
}

// A loop executed a few times: taken on every back-edge, not-taken once when it
// exits — the textbook pattern where 2-bit shines over 1-bit.
export function loopPattern(iterationsPerRun: number, runs: number): boolean[] {
  const out: boolean[] = [];
  for (let r = 0; r < runs; r++) {
    for (let i = 0; i < iterationsPerRun - 1; i++) out.push(true); // back-edge taken
    out.push(false); // loop exit
  }
  return out;
}
