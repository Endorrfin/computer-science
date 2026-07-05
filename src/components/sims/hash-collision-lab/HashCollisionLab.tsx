// [micro] hash-collision-lab — insert keys into a hash table and watch
// collisions happen. Two contrasts in one view: pick the HASH FUNCTION (a
// low-entropy "bad" hash that reads only the first letter, so same-initial keys
// pile up — versus FNV-1a, which scatters them), and see BOTH collision
// STRATEGIES side by side for those keys: chaining (each bucket grows a list)
// and linear probing (one flat slot array where clashes walk forward i,i+1,i+2…
// and breed clusters). Collisions glow, and when the load factor crosses the
// threshold the table REHASHES (doubles + reinserts). The clustering numbers —
// longest chain, longest run — come straight from the engine. Engine:
// hash-collision-lab/model. Reduced motion: Step inserts one key.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { CLUSTERING_KEYS, insertAll } from "./model.ts";
import type { HashName, HashRun } from "./model.ts";

const ACCENT = "#34D399";
const INIT_SIZE = 8; // small so a rehash is reachable within the key budget
const MIN_KEYS = 3;
const MAX_KEYS = CLUSTERING_KEYS.length; // 10

// Reconstruct the table state after the first `n` insertions (deterministic —
// same trick CacheSim uses: replay a prefix). Returns the run so both the live
// buckets/slots AND the running stats are exactly the engine's.
function runPrefix(keys: string[], n: number, size: number, hash: HashName, strategy: "chaining" | "linear"): HashRun {
  return insertAll(keys.slice(0, n), { size, hash, strategy });
}

export default function HashCollisionLab() {
  const [hash, setHash] = useState<HashName>("bad");
  const [numKeys, setNumKeys] = useState(8);
  const [i, setI] = useState(0); // keys inserted so far
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const keys = useMemo(() => CLUSTERING_KEYS.slice(0, numKeys), [numKeys]);
  const len = keys.length;

  // both strategies, full run (final stats) and prefix (live view)
  const chainFull = useMemo(() => insertAll([...keys], { size: INIT_SIZE, hash, strategy: "chaining" }), [keys, hash]);
  const linFull = useMemo(() => insertAll([...keys], { size: INIT_SIZE, hash, strategy: "linear" }), [keys, hash]);
  const chain = useMemo(() => runPrefix([...keys], i, INIT_SIZE, hash, "chaining"), [keys, i, hash]);
  const lin = useMemo(() => runPrefix([...keys], i, INIT_SIZE, hash, "linear"), [keys, i, hash]);

  const curKey = i > 0 ? keys[i - 1] : null;
  const chainStep = i > 0 ? chain.steps[i - 1] : null;
  const linStep = i > 0 ? lin.steps[i - 1] : null;
  const justRehashed = (chainStep?.rehashed ?? false) || (linStep?.rehashed ?? false);

  useSimClock(running, 1.4 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  function restart() {
    setI(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setI((x) => Math.min(len, x + 1));
  }
  function onReset() {
    setRunning(false);
    setI(0);
  }
  function pickHash(h: HashName) {
    setHash(h);
    setRunning(false);
    setI(0);
  }
  function pickKeys(n: number) {
    setNumKeys(n);
    setRunning(false);
    setI(0);
  }

  return (
    <SimShell
      title="Hash collision lab — spread, clash, and rehash"
      simKey="hash-collision-lab"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={`${hash === "bad" ? "bad hash (first letter only)" : "good hash (FNV-1a)"} · inserted ${i}/${len}${curKey ? ` · "${curKey}"` : ""}. Chaining: longest chain ${chainFull.maxChain}, ${chainFull.totalProbes} probes. Linear: longest run ${linFull.maxCluster}, ${linFull.totalProbes} probes.${justRehashed ? " ⚡ rehash!" : ""}`}
      controls={
        <div className="hcl-ctl">
          <div className="bit-seg" role="group" aria-label="Hash function">
            <button type="button" className={cx("bit-segbtn", hash === "bad" && "on")} onClick={() => pickHash("bad")}>
              bad hash
            </button>
            <button type="button" className={cx("bit-segbtn", hash === "good" && "on")} onClick={() => pickHash("good")}>
              good hash
            </button>
          </div>
          <label className="ss-field">
            keys: {numKeys}
            <input
              type="range"
              min={MIN_KEYS}
              max={MAX_KEYS}
              value={numKeys}
              onChange={(e) => pickKeys(Number(e.target.value))}
              aria-label={`Number of keys to insert: ${numKeys}`}
            />
          </label>
        </div>
      }
      footer={
        <div className="hcl-metrics" role="group" aria-label="Clustering metrics">
          <div className="hcl-mcol">
            <span className="hcl-mhead">chaining</span>
            <span className="hcl-mrow">
              longest chain <b className={chainFull.maxChain >= 4 ? "err" : "ok"}>{chainFull.maxChain}</b>
            </span>
            <span className="hcl-mrow">
              avg probes <b>{chainFull.avgProbes.toFixed(2)}</b>
            </span>
          </div>
          <div className="hcl-mcol">
            <span className="hcl-mhead">linear probing</span>
            <span className="hcl-mrow">
              longest run <b className={linFull.maxCluster >= 4 ? "err" : "ok"}>{linFull.maxCluster}</b>
            </span>
            <span className="hcl-mrow">
              avg probes <b>{linFull.avgProbes.toFixed(2)}</b>
            </span>
          </div>
          <div className="hcl-mcol">
            <span className="hcl-mhead">table</span>
            <span className="hcl-mrow">
              size <b>{chain.finalSize}</b>
            </span>
            <span className="hcl-mrow">
              load <b>{chain.loadFactor.toFixed(2)}</b>
            </span>
          </div>
        </div>
      }
    >
      <p className="hcl-blurb muted">
        {hash === "bad"
          ? "The bad hash reads only the first character, so every key that starts with the same letter wants the same bucket. Chaining piles them into one long list; linear probing smears them into one long run — collision after collision."
          : "FNV-1a mixes every byte of the key, so even lookalike keys scatter. Chains stay short and clusters stay small: the same keys, a good hash, a healthy table."}
      </p>

      <div className="hcl-panels">
        {/* CHAINING — buckets each hold a list */}
        <div className="hcl-panel">
          <div className="hcl-lbl">
            chaining — <b>{chain.finalSize}</b> buckets{chainStep?.rehashed && <span className="hcl-rehash"> ⚡ rehashed</span>}
          </div>
          <div className="hcl-buckets">
            {chain.buckets.map((bucket, idx) => {
              const isHome = chainStep !== null && chainStep.home === idx && !chainStep.rehashed;
              return (
                <div key={idx} className={cx("hcl-bucket", isHome && "home", bucket.length > 1 && "collide")}>
                  <span className="hcl-bidx">{idx}</span>
                  <div className="hcl-chain">
                    {bucket.length === 0 ? (
                      <span className="hcl-nil">·</span>
                    ) : (
                      bucket.map((k, ci) => (
                        <span key={ci} className={cx("hcl-node", isHome && k === curKey && "cur")}>
                          {k}
                          {ci < bucket.length - 1 && <i className="hcl-link" aria-hidden="true">→</i>}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LINEAR PROBING — one flat slot array; clusters are visible runs */}
        <div className="hcl-panel">
          <div className="hcl-lbl">
            linear probing — <b>{lin.finalSize}</b> slots{linStep?.rehashed && <span className="hcl-rehash"> ⚡ rehashed</span>}
          </div>
          <div className="hcl-slots" role="grid" aria-label="Linear-probing slots">
            {lin.slots.map((k, idx) => {
              const isHome = linStep !== null && linStep.home === idx && !linStep.rehashed;
              const onPath = linStep !== null && !linStep.rehashed && linStep.probeSeq.includes(idx);
              const isLanded = linStep !== null && linStep.slot === idx && !linStep.rehashed;
              return (
                <div
                  key={idx}
                  role="gridcell"
                  className={cx("hcl-slot", k !== null && "full", isHome && "home", onPath && "probe", isLanded && "landed")}
                  title={`slot ${idx}${k ? ` = ${k}` : " (empty)"}`}
                >
                  <span className="hcl-sidx">{idx}</span>
                  <span className="hcl-sval">{k ?? ""}</span>
                </div>
              );
            })}
          </div>
          {linStep && !linStep.rehashed && linStep.probes > 1 && (
            <div className="hcl-probehint muted">
              &quot;{linStep.key}&quot; wanted slot {linStep.home}, but it was taken — probed {linStep.probes} slots to land at{" "}
              {linStep.slot}.
            </div>
          )}
        </div>
      </div>

      {justRehashed && (
        <p className="hcl-rehash-note" role="status">
          ⚡ Rehash — the load factor crossed the threshold, so the table doubled and every key was reinserted into the roomier
          array. Costly once, but it keeps average probe counts low as the table grows.
        </p>
      )}
    </SimShell>
  );
}
