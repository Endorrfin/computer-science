// Engine truth-tests for ch.19 (Automata & regular languages). Same Node harness
// as test-ch17/18; CI-gated. Locks the claims the two sims make:
//   • DFA: the divisible-by-3 machine recognizes EXACTLY that language (no
//     counterexample up to length 12), and a deliberately-broken variant is
//     caught by the same grader — which is how the fsm-builder challenge is scored.
//   • regex ⇒ ε-NFA (Thompson) ⇒ DFA (subset construction) all describe the SAME
//     language: for several regexes we run the NFA and its determinized DFA on
//     every string up to length 6 and require identical accept/reject — an
//     executable proof of the chapter's central equivalence.

import {
  divisibleBy3DFA,
  endsWithAbbNFA,
  epsilonClosure,
  firstCounterexample,
  isBinaryDivisibleBy3,
  regexToNFA,
  runDFA,
  runNFA,
  subsetConstruction,
} from "../src/components/sims/automata/model.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}

// all binary strings up to length L (including "")
function allStrings(alphabet: string[], maxLen: number): string[] {
  const out: string[] = [""];
  let frontier = [""];
  for (let len = 0; len < maxLen; len++) {
    const next: string[] = [];
    for (const s of frontier) for (const c of alphabet) next.push(s + c);
    out.push(...next);
    frontier = next;
  }
  return out;
}

// ================= (A) DFA — divisible by 3 =================
{
  console.log("fsm-builder · divisible-by-3 DFA:");
  const dfa = divisibleBy3DFA();
  eq("accepts ε (value 0)", runDFA(dfa, "").accepted, true);
  eq('accepts "0"', runDFA(dfa, "0").accepted, true);
  eq('accepts "11" (3)', runDFA(dfa, "11").accepted, true);
  eq('accepts "110" (6)', runDFA(dfa, "110").accepted, true);
  eq('accepts "1001" (9)', runDFA(dfa, "1001").accepted, true);
  eq('rejects "1" (1)', runDFA(dfa, "1").accepted, false);
  eq('rejects "10" (2)', runDFA(dfa, "10").accepted, false);
  eq('rejects "101" (5)', runDFA(dfa, "101").accepted, false);
  // cross-check the machine against the arithmetic on every string ≤ 12 bits
  eq("no counterexample vs value%3==0 up to len 12", firstCounterexample(dfa, isBinaryDivisibleBy3, 12), null);
}
{
  console.log("fsm-builder · a wrong DFA is caught by the grader:");
  const broken = divisibleBy3DFA();
  broken.accept = ["r1"]; // accept remainder 1 instead of 0
  const ce = firstCounterexample(broken, isBinaryDivisibleBy3, 12);
  ok("broken accepting state ⇒ a counterexample exists", ce !== null, JSON.stringify(ce));
  // exhaustive predicate self-check
  eq("isBinaryDivisibleBy3('110')==true (6)", isBinaryDivisibleBy3("110"), true);
  eq("isBinaryDivisibleBy3('101')==false (5)", isBinaryDivisibleBy3("101"), false);
  eq("non-binary char ⇒ false", isBinaryDivisibleBy3("1a0"), false);
}

// ================= (B) regex → NFA (Thompson) =================
{
  console.log("regex-nfa · Thompson construction accepts the right strings:");
  const acc = (re: string, s: string): boolean => runNFA(regexToNFA(re), s).accepted;

  eq('a(b|c)* accepts "a"', acc("a(b|c)*", "a"), true);
  eq('a(b|c)* accepts "abccb"', acc("a(b|c)*", "abccb"), true);
  eq('a(b|c)* rejects "" ', acc("a(b|c)*", ""), false);
  eq('a(b|c)* rejects "aa"', acc("a(b|c)*", "aa"), false);

  eq('a* accepts ""', acc("a*", ""), true);
  eq('a* accepts "aaaa"', acc("a*", "aaaa"), true);
  eq('a+ rejects ""', acc("a+", ""), false);
  eq('a+ accepts "aaa"', acc("a+", "aaa"), true);
  eq('a? accepts ""', acc("a?", ""), true);
  eq('a? rejects "aa"', acc("a?", "aa"), false);
  eq('ab accepts "ab" only (not "a")', acc("ab", "ab") && !acc("ab", "a"), true);

  eq('(a|b)*abb accepts "aabb"', acc("(a|b)*abb", "aabb"), true);
  eq('(a|b)*abb accepts "babb"', acc("(a|b)*abb", "babb"), true);
  eq('(a|b)*abb rejects "abba"', acc("(a|b)*abb", "abba"), false);
  eq('(a|b)*abb rejects "ab"', acc("(a|b)*abb", "ab"), false);

  eq("alphabet is inferred & sorted", regexToNFA("a(b|c)*").alphabet, ["a", "b", "c"]);
  const run = runNFA(regexToNFA("(a|b)*abb"), "aabb");
  eq("NFA frames = input length + 1", run.frames.length, "aabb".length + 1);
}

// ================= (C) NFA ≡ DFA (subset construction) =================
{
  console.log("regex-nfa · determinized DFA agrees with the NFA everywhere:");
  const strings = allStrings(["a", "b"], 6);
  for (const re of ["(a|b)*abb", "a(a|b)*", "(ab)*", "a*b*"]) {
    const nfa = regexToNFA(re);
    const dfa = subsetConstruction(nfa);
    let agree = true;
    let witness = "";
    for (const s of strings) {
      if (runNFA(nfa, s).accepted !== runDFA(dfa, s).accepted) {
        agree = false;
        witness = s || "ε";
        break;
      }
    }
    ok(`NFA == subsetDFA for /${re}/ on all |s|≤6`, agree, `disagree on "${witness}"`);
  }
}
{
  console.log("regex-nfa · the classic ends-with-abb NFA → DFA:");
  const nfa = endsWithAbbNFA();
  const dfa = subsetConstruction(nfa);
  const strings = allStrings(["a", "b"], 6);
  let agree = true;
  for (const s of strings) if (runNFA(nfa, s).accepted !== runDFA(dfa, s).accepted) agree = false;
  ok("hand-written NFA matches its subset DFA on all |s|≤6", agree);
  eq('subset DFA accepts "aaabb"', runDFA(dfa, "aaabb").accepted, true);
  eq('subset DFA rejects "abab"', runDFA(dfa, "abab").accepted, false);
  ok("determinized DFA is a real DFA (≥ start + reachable subsets)", dfa.states.length >= 4);
}
{
  console.log("regex-nfa · ε-closure:");
  const nfa = regexToNFA("a*");
  const cl = epsilonClosure(nfa, [nfa.start]);
  ok("start's ε-closure contains an accepting state (a* accepts ε)", cl.some((s) => nfa.accept.includes(s)));
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch19: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch19: all checks pass");
