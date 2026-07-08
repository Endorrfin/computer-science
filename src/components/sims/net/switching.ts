// Engine for ch.26 — the learning Ethernet switch (switch-learning micro).
// A switch starts knowing nothing. For every frame it sees it LEARNS the source
// MAC → the port it arrived on, then decides where to send: if it already knows
// the destination it FORWARDS out that one port; if not it FLOODS out every
// other port. Over a few frames the table fills and flooding stops. Deterministic
// so the sim and tests agree. Erasable-syntax only.

export type Frame = { src: string; dst: string; inPort: number };

export type SwitchStep = {
  frame: Frame;
  learned: { mac: string; port: number } | null; // entry added/updated this step
  action: "flood" | "forward";
  outPorts: number[]; // ports the frame left on
  table: { mac: string; port: number }[]; // MAC table snapshot AFTER this frame
};

/**
 * Run `frames` through a switch with `nPorts` ports. Returns one step per frame,
 * each carrying what was learned, whether the switch flooded or forwarded, the
 * egress ports, and a snapshot of the MAC table afterward.
 */
export function runSwitch(frames: Frame[], nPorts: number): SwitchStep[] {
  const table = new Map<string, number>();
  const steps: SwitchStep[] = [];

  for (const frame of frames) {
    // 1. LEARN the source location (or refresh it if the host moved ports).
    let learned: { mac: string; port: number } | null = null;
    if (table.get(frame.src) !== frame.inPort) {
      table.set(frame.src, frame.inPort);
      learned = { mac: frame.src, port: frame.inPort };
    }

    // 2. DECIDE where to send. Known destination → one port; unknown → flood.
    const known = table.get(frame.dst);
    let action: "flood" | "forward";
    let outPorts: number[];
    if (known !== undefined && known !== frame.inPort) {
      action = "forward";
      outPorts = [known];
    } else {
      // Unknown (or destination is on the ingress port) → flood everywhere else.
      action = "flood";
      outPorts = [];
      for (let p = 0; p < nPorts; p++) if (p !== frame.inPort) outPorts.push(p);
    }

    steps.push({
      frame,
      learned,
      action,
      outPorts,
      table: [...table.entries()].map(([mac, port]) => ({ mac, port })).sort((a, b) => a.port - b.port),
    });
  }

  return steps;
}

/** How many of the steps flooded — the count that should fall as the table
    fills. Used by the test to prove learning actually reduces flooding. */
export function floodCount(steps: SwitchStep[]): number {
  return steps.filter((s) => s.action === "flood").length;
}
