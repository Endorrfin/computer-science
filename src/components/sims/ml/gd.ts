// Engine for the `gradient-bowl` micro (ch.33): gradient descent on a 2D loss
// surface. The surface is an elongated quadratic bowl L(a,b) = ½(a² + κ·b²) —
// honest and analytically clean, so the learning-rate lesson is exact: along
// the steep axis (curvature κ) the step is stable only while lr·κ < 2. Below
// that it converges; near 2/κ it oscillates; above it explodes. This IS the
// same gradient descent the MLP runs, shown on a surface you can see.
// Deterministic. Erasable-syntax only.

export const KAPPA = 6; // curvature of the steep (b) axis; gentle (a) axis is 1

export function lossAt(a: number, b: number): number {
  return 0.5 * (a * a + KAPPA * b * b);
}

/** ∇L = (a, κ·b). */
export function gradAt(a: number, b: number): [number, number] {
  return [a, KAPPA * b];
}

export type Outcome = "converge" | "oscillate" | "explode";
export type DescentStep = { a: number; b: number; loss: number };

/** The largest stable learning rate along the steep axis: steps stay bounded
 *  only while lr < 2/κ (the classic quadratic stability threshold). */
export const STABLE_LR = 2 / KAPPA;

/** Run gradient descent from a start point and classify what happened. */
export function descend(
  start: [number, number],
  lr: number,
  steps: number,
): { path: DescentStep[]; outcome: Outcome } {
  let [a, b] = start;
  const path: DescentStep[] = [{ a, b, loss: lossAt(a, b) }];
  for (let s = 0; s < steps; s++) {
    const [ga, gb] = gradAt(a, b);
    a -= lr * ga;
    b -= lr * gb;
    path.push({ a, b, loss: lossAt(a, b) });
    if (!isFinite(a) || !isFinite(b) || Math.abs(a) > 1e6 || Math.abs(b) > 1e6) {
      return { path, outcome: "explode" };
    }
  }
  const last = path[path.length - 1].loss;
  if (lr >= STABLE_LR) {
    // At/above threshold: either divergent (explode, caught above) or a
    // non-decaying oscillation along the steep axis.
    return { path, outcome: last > 1e-4 ? "oscillate" : "converge" };
  }
  return { path, outcome: last < 1e-3 ? "converge" : "oscillate" };
}
