// Engine — ch.19 Automata & regular languages. Two sims share this file:
//   • fsm-builder  → a DFA the user assembles; runDFA gives a step trace, and
//     the div-by-3 challenge is graded by comparing against the true language.
//   • regex-nfa    → a regex is compiled to an ε-NFA by Thompson's construction,
//     runNFA tracks the SET of live states (the "parallel paths"), and subset
//     construction turns that NFA into an equivalent DFA (Rabin–Scott, 1959).
//
// The point the whole chapter rests on — regular expressions, NFAs and DFAs all
// describe exactly the same class of languages — is not asserted here, it's
// executable: scripts/test-ch19.ts compiles regexes, runs both the NFA and its
// determinized DFA on hundreds of strings, and checks they agree.
//
// No React import — runs under Node for the tests.

// ------------------------------- types -------------------------------

export type DFA = {
  states: string[];
  alphabet: string[];
  start: string;
  accept: string[];
  // total-or-partial transition: state → symbol → state. Missing ⇒ dead/reject.
  delta: Record<string, Record<string, string>>;
};

export type NFA = {
  states: string[];
  alphabet: string[]; // symbols only; ε is the empty-string key ""
  start: string;
  accept: string[];
  // state → symbol|"" (ε) → list of next states
  delta: Record<string, Record<string, string[]>>;
};

// ------------------------------- DFA -------------------------------

export type DfaStep = {
  from: string;
  symbol: string;
  to: string | null; // null ⇒ no transition (fell into the dead state)
};

export type DfaRun = {
  input: string;
  accepted: boolean;
  visited: string[]; // states occupied BEFORE each symbol, plus the final one
  steps: DfaStep[];
  stuck: boolean; // hit a missing transition partway
};

export function runDFA(dfa: DFA, input: string): DfaRun {
  const visited: string[] = [dfa.start];
  const steps: DfaStep[] = [];
  let cur = dfa.start;
  let dead = false;
  for (const symbol of input) {
    const to: string | undefined = dfa.delta[cur]?.[symbol];
    steps.push({ from: cur, symbol, to: to ?? null });
    if (to === undefined) {
      dead = true;
      break;
    }
    cur = to;
    visited.push(cur);
  }
  const accepted = !dead && dfa.accept.includes(cur);
  return { input, accepted, visited, steps, stuck: dead };
}

// ------------------------------- NFA -------------------------------

/** ε-closure of a set of states (all states reachable by ε-edges alone). */
export function epsilonClosure(nfa: NFA, states: string[]): string[] {
  const seen = new Set(states);
  const stack = [...states];
  while (stack.length) {
    const s = stack.pop() as string;
    for (const t of nfa.delta[s]?.[""] ?? []) {
      if (!seen.has(t)) {
        seen.add(t);
        stack.push(t);
      }
    }
  }
  // stable order = declaration order in nfa.states
  return nfa.states.filter((s) => seen.has(s));
}

export type NfaRun = {
  input: string;
  accepted: boolean;
  frames: string[][]; // frames[k] = live states after consuming k symbols (ε-closed)
};

export function runNFA(nfa: NFA, input: string): NfaRun {
  let cur = epsilonClosure(nfa, [nfa.start]);
  const frames: string[][] = [cur];
  for (const symbol of input) {
    const moved = new Set<string>();
    for (const s of cur) for (const t of nfa.delta[s]?.[symbol] ?? []) moved.add(t);
    cur = epsilonClosure(nfa, [...moved]);
    frames.push(cur);
  }
  const accepted = cur.some((s) => nfa.accept.includes(s));
  return { input, accepted, frames };
}

// --------------------- regex → ε-NFA (Thompson) ---------------------
// Grammar (precedence low→high): union `|`  ·  concatenation  ·  postfix `* + ?`
//   ·  atom = literal | `(` union `)`.  `+` and `?` are desugared at parse time,
// so the builder only handles char/concat/union/star/ε.

type Node =
  | { t: "eps" }
  | { t: "char"; c: string }
  | { t: "concat"; a: Node; b: Node }
  | { t: "union"; a: Node; b: Node }
  | { t: "star"; a: Node };

const OPS = new Set(["|", "*", "+", "?", "(", ")"]);

export function parseRegex(re: string): Node {
  let i = 0;
  const peek = (): string | undefined => re[i];
  const eat = (): string => re[i++];

  function parseUnion(): Node {
    let left = parseConcat();
    while (peek() === "|") {
      eat();
      left = { t: "union", a: left, b: parseConcat() };
    }
    return left;
  }
  function parseConcat(): Node {
    const parts: Node[] = [];
    while (peek() !== undefined && peek() !== "|" && peek() !== ")") {
      parts.push(parsePostfix());
    }
    if (parts.length === 0) return { t: "eps" };
    return parts.reduce((a, b) => ({ t: "concat", a, b }));
  }
  function parsePostfix(): Node {
    let atom = parseAtom();
    let p = peek();
    while (p === "*" || p === "+" || p === "?") {
      eat();
      if (p === "*") atom = { t: "star", a: atom };
      else if (p === "+") atom = { t: "concat", a: atom, b: { t: "star", a: atom } };
      else atom = { t: "union", a: atom, b: { t: "eps" } };
      p = peek();
    }
    return atom;
  }
  function parseAtom(): Node {
    const ch = peek();
    if (ch === "(") {
      eat();
      const inner = parseUnion();
      if (peek() === ")") eat();
      return inner;
    }
    if (ch === undefined || OPS.has(ch)) return { t: "eps" };
    eat();
    return { t: "char", c: ch };
  }

  return parseUnion();
}

export function regexToNFA(re: string): NFA {
  const ast = parseRegex(re);
  let n = 0;
  const newState = (): string => `n${n++}`;
  const delta: Record<string, Record<string, string[]>> = {};
  const alphabet = new Set<string>();
  const ensure = (s: string): void => {
    if (!delta[s]) delta[s] = {};
  };
  const addEdge = (from: string, sym: string, to: string): void => {
    ensure(from);
    ensure(to);
    (delta[from][sym] ??= []).push(to);
  };

  function build(node: Node): { start: string; accept: string } {
    if (node.t === "eps") {
      const s = newState();
      const a = newState();
      addEdge(s, "", a);
      return { start: s, accept: a };
    }
    if (node.t === "char") {
      alphabet.add(node.c);
      const s = newState();
      const a = newState();
      addEdge(s, node.c, a);
      return { start: s, accept: a };
    }
    if (node.t === "concat") {
      const f1 = build(node.a);
      const f2 = build(node.b);
      addEdge(f1.accept, "", f2.start);
      return { start: f1.start, accept: f2.accept };
    }
    if (node.t === "union") {
      const s = newState();
      const a = newState();
      const f1 = build(node.a);
      const f2 = build(node.b);
      addEdge(s, "", f1.start);
      addEdge(s, "", f2.start);
      addEdge(f1.accept, "", a);
      addEdge(f2.accept, "", a);
      return { start: s, accept: a };
    }
    // star
    const s = newState();
    const a = newState();
    const f = build(node.a);
    addEdge(s, "", f.start);
    addEdge(s, "", a);
    addEdge(f.accept, "", f.start);
    addEdge(f.accept, "", a);
    return { start: s, accept: a };
  }

  const frag = build(ast);
  const states = Object.keys(delta);
  return { states, alphabet: [...alphabet].sort(), start: frag.start, accept: [frag.accept], delta };
}

// --------------------- NFA → DFA (subset construction) ---------------------
// Rabin–Scott, 1959: the powerset of NFA states, reachable subsets only. Proves
// nondeterminism adds no power (it can cost states — the classic blow-up).

function keyOf(states: string[]): string {
  return states.length ? states.join(",") : "∅";
}

export function subsetConstruction(nfa: NFA): DFA {
  const startSet = epsilonClosure(nfa, [nfa.start]);
  const startKey = keyOf(startSet);
  const delta: Record<string, Record<string, string>> = {};
  const accept: string[] = [];
  const seen = new Map<string, string[]>([[startKey, startSet]]);
  const queue: string[] = [startKey];

  while (queue.length) {
    const key = queue.shift() as string;
    const set = seen.get(key) as string[];
    delta[key] = {};
    if (set.some((s) => nfa.accept.includes(s))) accept.push(key);
    for (const sym of nfa.alphabet) {
      const moved = new Set<string>();
      for (const s of set) for (const t of nfa.delta[s]?.[sym] ?? []) moved.add(t);
      const closed = epsilonClosure(nfa, [...moved]);
      const nk = keyOf(closed);
      delta[key][sym] = nk;
      if (!seen.has(nk)) {
        seen.set(nk, closed);
        queue.push(nk);
      }
    }
  }
  // include the empty/dead state if any transition reached it
  if (!delta["∅"] && [...seen.keys()].includes("∅")) delta["∅"] = {};
  return { states: [...seen.keys()], alphabet: nfa.alphabet, start: startKey, accept, delta };
}

// ------------------------------- languages -------------------------------

/** The reference regular language for the fsm-builder challenge: binary strings
    (MSB first) whose value is divisible by 3. Empty string = value 0 ⇒ in L. */
export function isBinaryDivisibleBy3(s: string): boolean {
  let r = 0;
  for (const ch of s) {
    if (ch !== "0" && ch !== "1") return false;
    r = (r * 2 + (ch === "1" ? 1 : 0)) % 3;
  }
  return r === 0;
}

/** The 3-state DFA that recognizes it (remainder mod 3 as you shift in bits). */
export function divisibleBy3DFA(): DFA {
  return {
    states: ["r0", "r1", "r2"],
    alphabet: ["0", "1"],
    start: "r0",
    accept: ["r0"],
    delta: {
      r0: { "0": "r0", "1": "r1" },
      r1: { "0": "r2", "1": "r0" },
      r2: { "0": "r1", "1": "r2" },
    },
  };
}

export type Counterexample = { input: string; predicate: boolean; machine: boolean };

/** Grade a DFA against a language predicate by exhaustively testing every
    string over the alphabet up to maxLen. Returns the first disagreement, or
    null if the machine matches the language on all of them (a real proof for
    small automata, since a k-state DFA's behavior is fixed by short strings). */
export function firstCounterexample(
  dfa: DFA,
  predicate: (s: string) => boolean,
  maxLen: number,
): Counterexample | null {
  const alpha = dfa.alphabet;
  let frontier: string[] = [""];
  for (let len = 0; len <= maxLen; len++) {
    for (const s of frontier) {
      const machine = runDFA(dfa, s).accepted;
      if (machine !== predicate(s)) return { input: s === "" ? "ε" : s, predicate: predicate(s), machine };
    }
    const next: string[] = [];
    for (const s of frontier) for (const c of alpha) next.push(s + c);
    frontier = next;
  }
  return null;
}

// ------------------------------- sample automata -------------------------------
// Used by the sims and pinned by the tests. `endsAbb` shows the NFA→DFA idea:
// an NFA "guesses" when the final abb begins; its DFA tracks the longest suffix.

/** Classic NFA for (a|b)*abb — nondeterministic: it guesses the tail. */
export function endsWithAbbNFA(): NFA {
  return {
    states: ["q0", "q1", "q2", "q3"],
    alphabet: ["a", "b"],
    start: "q0",
    accept: ["q3"],
    delta: {
      q0: { a: ["q0", "q1"], b: ["q0"] },
      q1: { b: ["q2"] },
      q2: { b: ["q3"] },
      q3: {},
    },
  };
}
