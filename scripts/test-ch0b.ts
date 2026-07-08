// ch.0b · Math toolkit — engine checks. Exact big-integer combinatorics, the
// birthday paradox (exact curve + a deterministic Monte-Carlo that tracks it),
// and a propositional-logic parser/evaluator with truth-table classification &
// equivalence (De Morgan, contrapositive, material implication). Deterministic.
// Run: node --experimental-strip-types scripts/test-ch0b.ts
import {
  factorial, permutations, combinations, multisets, tuples, pascalRow, count, formatBig,
} from "../src/components/sims/math/combinatorics.ts";
import {
  birthdayProbExact, smallestGroupFor, birthdayMonteCarlo, expectedCollidingPairs,
} from "../src/components/sims/math/birthday.ts";
import { truthTable, equivalent, evaluate, parse, variables } from "../src/components/sims/math/logic.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}
function eqBig(name: string, got: bigint, want: bigint): void {
  ok(name, got === want, `got ${got}  want ${want}`);
}
function throws(name: string, fn: () => unknown): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  ok(name, threw, "expected an exception");
}

// ===================== (A) combinatorics =====================
{
  console.log("combinatorics · factorial (exact past double precision):");
  eqBig("0! = 1", factorial(0), 1n);
  eqBig("1! = 1", factorial(1), 1n);
  eqBig("5! = 120", factorial(5), 120n);
  eqBig("20! exact", factorial(20), 2432902008176640000n);
  eqBig("25! exact (doubles would round this)", factorial(25), 15511210043330985984000000n);

  console.log("combinatorics · permutations (ordered):");
  eqBig("P(5,2) = 20", permutations(5, 2), 20n);
  eqBig("P(5,0) = 1", permutations(5, 0), 1n);
  eqBig("P(5,5) = 5! = 120", permutations(5, 5), 120n);
  eqBig("P(4,5) = 0 (can't arrange more than you have)", permutations(4, 5), 0n);
  eqBig("P(10,3) = 720", permutations(10, 3), 720n);

  console.log("combinatorics · combinations (unordered):");
  eqBig("C(5,2) = 10", combinations(5, 2), 10n);
  eqBig("C(52,5) = 2,598,960 (poker hands)", combinations(52, 5), 2598960n);
  eqBig("C(10,0) = 1", combinations(10, 0), 1n);
  eqBig("C(4,5) = 0", combinations(4, 5), 0n);
  ok("symmetry C(n,r) = C(n,n−r)", [ [9,2],[20,7],[52,5] ].every(([n,r]) => combinations(n,r) === combinations(n, n-r)));
  ok("C(n,r) = P(n,r) / r!", [ [7,3],[10,4],[52,5] ].every(([n,r]) => combinations(n,r) === permutations(n,r) / factorial(r)));

  console.log("combinatorics · Pascal's triangle:");
  ok("row 5 = [1,5,10,10,5,1]", JSON.stringify(pascalRow(5).map(String)) === JSON.stringify(["1","5","10","10","5","1"]));
  ok("row n sums to 2^n", [0,1,5,10,20].every((n) => pascalRow(n).reduce((a,b) => a+b, 0n) === 2n ** BigInt(n)));
  ok("row entries equal C(n,k)", [0,1,4,8,12].every((n) => pascalRow(n).every((v,k) => v === combinations(n,k))));
  ok("Pascal recurrence C(n,k)=C(n−1,k−1)+C(n−1,k)", (() => {
    for (let n=1;n<=12;n++) for (let k=1;k<n;k++) if (combinations(n,k) !== combinations(n-1,k-1)+combinations(n-1,k)) return false;
    return true;
  })());

  console.log("combinatorics · repetition (stars-and-bars, tuples):");
  eqBig("multisets(3,2) = C(4,2) = 6", multisets(3, 2), 6n);
  eqBig("multisets(5,3) = C(7,3) = 35", multisets(5, 3), 35n);
  eqBig("multisets(n,0) = 1", multisets(7, 0), 1n);
  eqBig("multisets(1,k) = 1 (one type)", multisets(1, 9), 1n);
  eqBig("tuples(2,8) = 256 (a byte)", tuples(2, 8), 256n);
  eqBig("tuples(10,3) = 1000", tuples(10, 3), 1000n);
  ok("count() dispatches to the four rules", count("permutation",5,2) === 20n && count("combination",5,2) === 10n && count("tuple",2,8) === 256n && count("multiset",3,2) === 6n);
  ok("formatBig keeps small numbers exact, summarizes huge ones", formatBig(120n) === "120" && /digits\)$/.test(formatBig(factorial(60))));

  console.log("combinatorics · input guards:");
  throws("factorial(-1) throws", () => factorial(-1));
  throws("combinations(5, 2.5) throws", () => combinations(5, 2.5));
}

// ===================== (B) birthday paradox =====================
{
  console.log("birthday · the exact curve:");
  ok("P(1) = 0 and P(0) = 0", birthdayProbExact(1) === 0 && birthdayProbExact(0) === 0);
  ok("P(23) ≈ 0.5073 (the famous just-over-half)", Math.abs(birthdayProbExact(23) - 0.5072972) < 1e-4, `got ${birthdayProbExact(23)}`);
  ok("P(366) = 1 and P(400) = 1 (pigeonhole)", birthdayProbExact(366) === 1 && birthdayProbExact(400) === 1);
  ok("P is strictly increasing 1…60", (() => { for (let n=2;n<=60;n++) if (birthdayProbExact(n) <= birthdayProbExact(n-1)) return false; return true; })());
  ok("expected colliding pairs at 23 ≈ 0.693", Math.abs(expectedCollidingPairs(23) - 253/365) < 1e-9);

  console.log("birthday · threshold crossings:");
  ok("smallestGroupFor(0.5) = 23", smallestGroupFor(0.5) === 23, `got ${smallestGroupFor(0.5)}`);
  ok("smallestGroupFor(0.99) = 57", smallestGroupFor(0.99) === 57, `got ${smallestGroupFor(0.99)}`);
  ok("smallestGroupFor(0.999) = 70", smallestGroupFor(0.999) === 70, `got ${smallestGroupFor(0.999)}`);

  console.log("birthday · Monte-Carlo converges to the exact curve (seeded):");
  for (const n of [10, 23, 40]) {
    const mc = birthdayMonteCarlo(n, 20000, 12345);
    const ex = birthdayProbExact(n);
    ok(`MC(${n}, 20k) ≈ exact (|Δ| < 0.03)`, Math.abs(mc - ex) < 0.03, `mc ${mc.toFixed(4)} vs exact ${ex.toFixed(4)}`);
  }
  ok("MC is deterministic for a fixed seed", birthdayMonteCarlo(23, 5000, 7) === birthdayMonteCarlo(23, 5000, 7));
  ok("MC(400) = 1 (always collides)", birthdayMonteCarlo(400, 200, 1) === 1);
}

// ===================== (C) propositional logic =====================
{
  console.log("logic · evaluation of the connectives:");
  ok("¬, ∧, ∨ basics", evaluate(parse("not p"), {p:true}) === false && evaluate(parse("p and q"), {p:true,q:false}) === false && evaluate(parse("p or q"), {p:false,q:true}) === true);
  ok("→ is false only for T→F", evaluate(parse("p -> q"), {p:true,q:false}) === false && [ [true,true],[false,false],[false,true] ].every(([p,q]) => evaluate(parse("p -> q"), {p,q}) === true));
  ok("↔ is 'same truth value'", evaluate(parse("p <-> q"), {p:true,q:true}) === true && evaluate(parse("p <-> q"), {p:true,q:false}) === false);

  console.log("logic · classification:");
  ok("p ∨ ¬p is a tautology", truthTable("p or not p").classification === "tautology");
  ok("p ∧ ¬p is a contradiction", truthTable("p and not p").classification === "contradiction");
  ok("p ∧ q is a contingency", truthTable("p and q").classification === "contingency");
  ok("(p→q) ∨ (q→p) is a tautology", truthTable("(p -> q) or (q -> p)").classification === "tautology");
  ok("constants: 'p or 1' taut, 'p and 0' contradiction", truthTable("p or 1").classification === "tautology" && truthTable("p and 0").classification === "contradiction");

  console.log("logic · truth-table shape:");
  const tt = truthTable("p and q");
  ok("variables sorted; 2^v rows", JSON.stringify(tt.variables) === JSON.stringify(["p","q"]) && tt.rows.length === 4);
  ok("first row is all-true; only TT is true for ∧", tt.rows[0].value === true && tt.rows.slice(1).every((r) => r.value === false));
  ok("3 variables → 8 rows", truthTable("p and (q or r)").rows.length === 8);

  console.log("logic · the classic equivalences:");
  ok("De Morgan ¬(p∧q) ≡ ¬p∨¬q", equivalent("not (p and q)", "not p or not q"));
  ok("De Morgan ¬(p∨q) ≡ ¬p∧¬q", equivalent("not (p or q)", "not p and not q"));
  ok("material implication p→q ≡ ¬p∨q", equivalent("p -> q", "not p or q"));
  ok("contrapositive p→q ≡ ¬q→¬p", equivalent("p -> q", "not q -> not p"));
  ok("biconditional p↔q ≡ (p→q)∧(q→p)", equivalent("p <-> q", "(p -> q) and (q -> p)"));
  ok("converse is NOT equivalent: p→q ≢ q→p", !equivalent("p -> q", "q -> p"));

  console.log("logic · precedence & associativity:");
  ok("¬ binds tighter than ∨: 'not p or q' = '(¬p)∨q'", equivalent("not p or q", "(not p) or q") && !equivalent("not p or q", "not (p or q)"));
  ok("∧ binds tighter than ∨: 'p or q and r' = 'p∨(q∧r)'", equivalent("p or q and r", "p or (q and r)") && !equivalent("p or q and r", "(p or q) and r"));
  ok("→ is right-associative: 'p->q->r' = 'p->(q->r)'", equivalent("p -> q -> r", "p -> (q -> r)") && !equivalent("p -> q -> r", "(p -> q) -> r"));
  ok("variables() collects & sorts", JSON.stringify(variables(parse("r or (p and q)"))) === JSON.stringify(["p","q","r"]));

  console.log("logic · parser rejects malformed input:");
  throws("'p and' (missing operand)", () => parse("p and"));
  throws("'(p' (unbalanced paren)", () => parse("(p"));
  throws("'p q' (two atoms, no operator)", () => parse("p q"));
  throws("unbound variable at eval", () => evaluate(parse("p and q"), {p:true}));
}

console.log(failed === 0 ? "\n✓ ch.0b math engines: all checks pass" : `\n✗ ch.0b: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
