// Pure engine — the discipline map for ch.0a (The Map). A DIFFERENT view of
// computer science than the landing's vertical spectrum stack: CS as a
// connected landscape of ten areas, laid out on a ring, with the intellectual
// links that tie them together (bits run on gates; adversaries live on the
// wire; models learn from data). Each area maps to one part of this guide.
// The integrity contract (scripts/test-ch0a.ts): every area points to a real
// part, every link joins two real areas, the ten content parts p1…p10 are each
// covered exactly once, and the graph is connected. Erasable-syntax only.

export type Area = {
  id: string;
  name: string;
  /** One-line "what this branch of CS is about". */
  blurb: string;
  partId: string;
  /** Position on the ring, 0…9 clockwise from the top — for radial layout. */
  slot: number;
};

export type Link = {
  from: string;
  to: string;
  /** Why these two areas touch — the idea that crosses the boundary. */
  label: string;
};

export const AREAS: Area[] = [
  { id: "info", name: "Information", blurb: "Representing anything — numbers, text, images, sound — as bits, and compressing it.", partId: "p1", slot: 0 },
  { id: "hardware", name: "Hardware", blurb: "From transistors and logic gates up to a CPU that runs a program.", partId: "p2", slot: 1 },
  { id: "code", name: "Programming", blurb: "Languages, compilers, and the engineering that keeps big systems sane.", partId: "p3", slot: 2 },
  { id: "algorithms", name: "Algorithms", blurb: "The data structures and techniques that make computation fast — and the cost model for it.", partId: "p4", slot: 3 },
  { id: "theory", name: "Theory", blurb: "What can be computed at all, and how hard it is — automata, Turing machines, P vs NP.", partId: "p5", slot: 4 },
  { id: "systems", name: "Operating systems", blurb: "The illusion of one machine per program: processes, memory, files, concurrency.", partId: "p6", slot: 5 },
  { id: "networks", name: "Networks", blurb: "Getting bits reliably from one machine to another across the planet.", partId: "p7", slot: 6 },
  { id: "data", name: "Data", blurb: "Remembering at scale — databases, indexes, transactions, and distributed systems.", partId: "p8", slot: 7 },
  { id: "security", name: "Security", blurb: "The adversarial mindset: cryptography, attacks, and defense in depth.", partId: "p9", slot: 8 },
  { id: "ai", name: "Intelligence", blurb: "Machines that learn from data — from gradient descent to transformers.", partId: "p10", slot: 9 },
];

export const LINKS: Link[] = [
  { from: "info", to: "hardware", label: "bits run on gates" },
  { from: "hardware", to: "systems", label: "the OS drives the machine" },
  { from: "hardware", to: "code", label: "languages compile to the CPU" },
  { from: "code", to: "algorithms", label: "programs implement algorithms" },
  { from: "theory", to: "algorithms", label: "the limits of the possible" },
  { from: "theory", to: "code", label: "grammars define languages" },
  { from: "systems", to: "networks", label: "sockets & syscalls" },
  { from: "systems", to: "data", label: "storage & durability" },
  { from: "networks", to: "security", label: "adversaries on the wire" },
  { from: "security", to: "data", label: "protect what’s stored" },
  { from: "data", to: "ai", label: "models learn from data" },
  { from: "algorithms", to: "ai", label: "learning is optimization" },
];

export function areaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

/** The areas directly linked to `id` (undirected), with the crossing idea. */
export function neighborsOf(id: string): { area: Area; label: string }[] {
  const out: { area: Area; label: string }[] = [];
  for (const l of LINKS) {
    if (l.from === id) {
      const a = areaById(l.to);
      if (a) out.push({ area: a, label: l.label });
    } else if (l.to === id) {
      const a = areaById(l.from);
      if (a) out.push({ area: a, label: l.label });
    }
  }
  return out;
}

/** Is the area graph connected (every area reachable from the first)? */
export function isConnected(): boolean {
  if (AREAS.length === 0) return true;
  const adj = new Map<string, string[]>();
  for (const a of AREAS) adj.set(a.id, []);
  for (const l of LINKS) {
    adj.get(l.from)?.push(l.to);
    adj.get(l.to)?.push(l.from);
  }
  const seen = new Set<string>([AREAS[0].id]);
  const stack = [AREAS[0].id];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const nb of adj.get(cur) ?? []) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  return seen.size === AREAS.length;
}
