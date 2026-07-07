// [micro] greedy-fails — making change, where greedy both wins and loses. Greedy
// grabs the largest coin that fits, over and over: optimal on real currencies
// (1,5,10,25), but on {1,3,4} making 6 it takes 4+1+1 = 3 when 3+3 = 2 is better.
// The only way to KNOW the minimum is DP over every amount. Edit the coins, set an
// amount, and hunt the smallest amount where greedy is beaten. Purely reactive.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { findCounterexample, greedyChange, optimalChange, presets } from "./model.ts";

const ACCENT = "#34D399";

function parseCoins(s: string): number[] {
  const set = new Set<number>();
  for (const p of s.split(/[^0-9]+/)) {
    const v = Number.parseInt(p, 10);
    if (Number.isFinite(v) && v > 0) set.add(v);
  }
  return [...set].sort((a, b) => a - b);
}

export default function GreedyFails() {
  const [coinStr, setCoinStr] = useState("1, 3, 4");
  const [amount, setAmount] = useState(6);
  const coins = useMemo(() => parseCoins(coinStr), [coinStr]);

  const greedy = useMemo(() => greedyChange(coins, amount), [coins, amount]);
  const optimal = useMemo(() => optimalChange(coins, amount), [coins, amount]);
  const counter = useMemo(() => findCounterexample(coins, 200), [coins]);

  const greedyLoses = optimal.feasible && (!greedy.feasible || greedy.count > optimal.count);
  const verdict = !optimal.feasible
    ? `${amount} can't be made from {${coins.join(", ")}} at all.`
    : greedyLoses
      ? !greedy.feasible
        ? `Greedy gets stuck — it can't make ${amount}, but the optimum uses ${optimal.count}.`
        : `Greedy uses ${greedy.count}; the optimum is ${optimal.count}. Greedy loses by ${greedy.count - optimal.count}.`
      : `Greedy matches the optimum (${optimal.count} coins). ✓`;

  const status = `{${coins.join(", ")}} · make ${amount} — ${verdict} ${counter ? `This system is NOT canonical (first failure at ${counter.amount}).` : "No failure ≤ 200 — canonical here."}`;

  return (
    <SimShell
      title="Greedy vs optimal — making change"
      simKey="greedy-fails"
      kind="micro"
      accent={ACCENT}
      onReset={() => { setCoinStr("1, 3, 4"); setAmount(6); }}
      status={status}
      controls={
        <div className="gf-ctl">
          <label className="ss-field">coins
            <input className="gf-input" value={coinStr} onChange={(e) => setCoinStr(e.target.value)} aria-label="Coin denominations, comma separated" spellCheck={false} />
          </label>
          <label className="ss-field">amount
            <input className="gf-input gf-input--num" type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number.parseInt(e.target.value, 10) || 1))} aria-label="Amount to make" />
          </label>
          <div className="gf-presets">
            {presets().map((p) => (
              <button key={p.name} type="button" className="btn gf-preset" onClick={() => setCoinStr(p.coins.join(", "))} title={p.canonical ? "canonical" : "greedy fails somewhere"}>{p.name}</button>
            ))}
          </div>
          <button type="button" className={cx("btn", counter && "pf-boss-btn")} disabled={!counter} onClick={() => counter && setAmount(counter.amount)}>
            {counter ? `↯ jump to failure (${counter.amount})` : "no failure ≤ 200"}
          </button>
        </div>
      }
      footer={
        <div className="gf-foot">
          <span className={cx("gf-flag", greedyLoses ? "bad" : "ok")}>{greedyLoses ? "greedy is NOT optimal here" : "greedy is optimal here"}</span>
          <span className={cx("gf-flag", counter ? "bad" : "ok")}>{counter ? `non-canonical (fails at ${counter.amount})` : "canonical ≤ 200"}</span>
        </div>
      }
    >
      <div className="gf-stage">
        <div className={cx("gf-card", greedyLoses && "lose")}>
          <div className="gf-card-head">greedy <span className="repr-dim">largest-coin-first</span></div>
          {greedy.feasible ? (
            <>
              <div className="gf-coins">
                {greedy.used.map((u, i) => (
                  <span key={i} className="gf-coin-group">{Array.from({ length: u.times }, (_x, j) => <span key={j} className="gf-coin">{u.coin}</span>)}</span>
                ))}
              </div>
              <div className="gf-count"><b>{greedy.count}</b> coins</div>
            </>
          ) : (
            <div className="gf-stuck">stuck — can't make {amount}</div>
          )}
        </div>
        <div className="gf-vs" aria-hidden="true">vs</div>
        <div className={cx("gf-card", greedyLoses && "win")}>
          <div className="gf-card-head">optimal <span className="repr-dim">DP over every amount</span></div>
          {optimal.feasible ? (
            <>
              <div className="gf-coins">
                {optimal.used.map((u, i) => (
                  <span key={i} className="gf-coin-group">{Array.from({ length: u.times }, (_x, j) => <span key={j} className="gf-coin gf-coin--opt">{u.coin}</span>)}</span>
                ))}
              </div>
              <div className="gf-count"><b>{optimal.count}</b> coins</div>
            </>
          ) : (
            <div className="gf-stuck">impossible from these coins</div>
          )}
        </div>
      </div>
    </SimShell>
  );
}
