// ch.32 · Security — engine checks (SQL injection AST · password entropy · XSS).
// Run: node --experimental-strip-types scripts/test-ch32.ts
import { buildConcatQuery, buildParamQuery, evaluate, runQuery, USERS } from "../src/components/sims/security/sqli.ts";
import {
  charset, idealEntropyBits, strengthBand, dictionaryHit, deLeet,
  crackSeconds, humanTime, assess, averageGuesses,
} from "../src/components/sims/security/passwords.ts";
import { escapeHtml, detectVectors, analyze } from "../src/components/sims/security/xss.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`); }
}
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

// ===================== (A) SQL injection =====================
{
  console.log("sqli · legit credentials:");
  const good = evaluate(buildConcatQuery("admin", "demo-password"));
  ok("correct login succeeds", good.loggedIn && good.loggedInAs === "admin");
  ok("...and is NOT flagged as a bypass", good.bypass === false);
  const bad = evaluate(buildConcatQuery("admin", "wrong"));
  ok("wrong password fails on the concat query", bad.loggedIn === false);

  console.log("sqli · injection on the concat query:");
  const taut = evaluate(buildConcatQuery("' OR 1=1--", "anything"));
  ok("' OR 1=1-- logs in", taut.loggedIn);
  ok("...and it's a bypass (no valid password)", taut.bypass);
  eq("...returning every row", runQuery(buildConcatQuery("' OR 1=1--", "x")).length, USERS.length);
  const comment = evaluate(buildConcatQuery("admin'--", "anything"));
  ok("admin'-- logs in as admin by commenting out the password check", comment.loggedIn && comment.loggedInAs === "admin");
  ok("...and it's a bypass", comment.bypass);
  // The AST proves WHY: concat produced a top-level OR (extra boolean structure).
  ok("concat AST for the tautology has an OR node at the top", buildConcatQuery("' OR 1=1--", "x").ast?.kind === "or");

  console.log("sqli · same payloads, parameterized:");
  const p1 = evaluate(buildParamQuery("' OR 1=1--", "anything"));
  ok("' OR 1=1-- as a bound param does NOT log in", p1.loggedIn === false && p1.bypass === false);
  const p2 = evaluate(buildParamQuery("admin'--", "anything"));
  ok("admin'-- as a bound param does NOT log in", p2.loggedIn === false);
  const p3 = evaluate(buildParamQuery("admin", "demo-password"));
  ok("correct login still works when parameterized", p3.loggedIn && !p3.bypass);
  ok("parameterized AST stays name=? AND pw=? (an AND of two comparisons)", buildParamQuery("' OR 1=1--", "x").ast?.kind === "and");
}

// ===================== (B) password entropy =====================
{
  console.log("passwords · charset & entropy:");
  eq("lowercase only → pool 26", charset("abc").size, 26);
  eq("mixed classes → pool 95", charset("Aa1!").size, 95);
  eq("8 lowercase chars ≈ 37.6 bits", Math.round(idealEntropyBits("abcdefgh") * 10) / 10, 37.6);
  ok("longer password → more ideal bits", idealEntropyBits("aaaaaaaaaa") > idealEntropyBits("aaaaa"));
  eq("band of ~37.6 bits is 'reasonable'", strengthBand(idealEntropyBits("abcdefgh")), "reasonable");
  eq("128 bits is 'very strong'", strengthBand(128), "very strong");

  console.log("passwords · the dictionary trap:");
  eq("deLeet('P@ssw0rd') = 'password'", deLeet("P@ssw0rd"), "password");
  ok("'P@ssw0rd' is a dictionary hit → base 'password'", dictionaryHit("P@ssw0rd").hit && dictionaryHit("P@ssw0rd").base === "password");
  ok("'Monkey1' is a dictionary hit (trailing digit)", dictionaryHit("Monkey1").hit);
  ok("'Tr0ub4dour&3' is NOT in this tiny wordlist", dictionaryHit("Tr0ub4dour&3").hit === false);
  const rep = assess("P@ssw0rd");
  ok("naive ideal bits look 'strong-ish' (>50)", rep.idealBits > 50, `bits=${rep.idealBits.toFixed(1)}`);
  ok("...but honest crack time on a fast hash is instant", rep.crack.find((c) => c.id === "fast-1gpu")!.time === "instant");

  console.log("passwords · crack time math:");
  eq("averageGuesses(11) = 2^10 = 1024", averageGuesses(11), 1024);
  ok("crackSeconds falls as the attacker gets faster", crackSeconds(60, 1e11) < crackSeconds(60, 1e3));
  eq("humanTime(0.2) = instant", humanTime(0.2), "instant");
  eq("humanTime(90) = 2 min", humanTime(90), "2 min");
  ok("a 12-char full-charset password (~79 bits) resists a GPU farm for decades (>10 yrs)", crackSeconds(idealEntropyBits("Aa1!Bb2@Cc3#"), 1e14) > 10 * 365 * 86400, `${(crackSeconds(idealEntropyBits("Aa1!Bb2@Cc3#"), 1e14) / (365 * 86400)).toFixed(0)} yrs`);
}

// ===================== (C) XSS escaping =====================
{
  console.log("xss · escaping:");
  eq("escapes < > & \" '", escapeHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  eq("ampersand is escaped first (no double-encoding)", escapeHtml("&lt;"), "&amp;lt;");
  ok("plain text is unchanged", escapeHtml("hello world") === "hello world");

  console.log("xss · active-markup detection:");
  ok("<script> is detected", detectVectors("<script>alert(1)</script>").length > 0);
  ok("img onerror is detected (no <script> needed)", detectVectors('<img src=x onerror="x()">').some((v) => v.pattern.includes("on")));
  ok("plain text has no vectors", detectVectors("Great post!").length === 0);

  console.log("xss · raw vs escaped rendering:");
  const rawScript = analyze("<script>steal()</script>", false);
  ok("raw <script> executes", rawScript.executes);
  const escScript = analyze("<script>steal()</script>", true);
  ok("escaped <script> does NOT execute", escScript.executes === false);
  eq("...and renders as literal text", escScript.output, "&lt;script&gt;steal()&lt;/script&gt;");
  ok("a normal comment never executes, raw or escaped", analyze("nice!", false).executes === false && analyze("nice!", true).executes === false);
}

console.log(failed === 0 ? "\n✓ ch.32 security engines: all checks pass" : `\n✗ ch.32: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
