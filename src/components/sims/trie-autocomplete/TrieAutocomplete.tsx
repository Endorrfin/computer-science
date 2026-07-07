// [micro] trie-autocomplete — a trie (prefix tree) that you type INTO and watch
// spend the key one character at a time. Every edge is a letter, so the path
// from the root spells a prefix; a ringed node means "a real word ends here".
// As you type, the sim walks the prefix edge by edge and lights the matched
// path — when the path runs out, there is simply no edge to follow and the
// lookup says "no match". Inserting a word reuses whatever prefix already
// exists (c-a-r is stored once for "car", "card", "care") and only creates
// the nodes the key needs beyond it, which is why the node count grows far
// slower than the total characters stored.
//
// The second beat is autocomplete. Because words that share a prefix share the
// nodes for that prefix, the set of completions for a prefix is EXACTLY the
// words in the subtree hanging under it — walk to the prefix, then collect
// every marked node below. This sim is reactive (no transport): typing drives
// the highlight and the suggestion list; Insert mutates the trie and briefly
// flags the nodes it had to create. Reduced motion: nothing animates on a clock.
import { useReducer, useRef, useState } from "react";
import SimShell from "../SimShell.tsx";
import {
  build,
  insert,
  walkPrefix,
  autocomplete,
  countNodes,
  trieLayout,
} from "./model.ts";

const ACCENT = "#34D399";

// Seed dictionary — deliberately prefix-heavy so the sharing is obvious:
// car/card/care/cart/cat share c-a; do/dog/dodge share d-o; code/coder share
// c-o-d-e; and cat/code both branch off "c" alongside the car cluster.
const SEED = ["car", "card", "care", "cart", "cat", "dog", "do", "dodge", "code", "coder"];

// ---- SVG geometry (viewBox units). trieLayout hands back x in leaf-slot units
// (0..width) and an integer depth; we map x → horizontal position and depth →
// row. ----
const W = 620;
const PAD_X = 26; // keep the outermost nodes off the edges
const PAD_T = 24;
const LEVEL_GAP = 60;
const NODE_R = 15;

export default function TrieAutocomplete() {
  // The trie is mutated in place by insert(), so we keep it in a ref and bump a
  // version counter after each mutation. version drives the re-render AND is a
  // memo dependency, so the derived views recompute even though the ref that
  // holds the trie keeps a stable identity across mutations.
  const trieRef = useRef(build(SEED));
  // Force a re-render after the mutable trie changes (the trie lives in a ref so
  // React can't see the mutation). We don't read the counter — bumping it renders.
  const [, bumpVersion] = useReducer((x: number) => x + 1, 0);
  const [query, setQuery] = useState("car");
  // ids of nodes created by the most recent insert, flagged briefly in green.
  const [freshIds, setFreshIds] = useState<Set<number>>(() => new Set());

  const trie = trieRef.current;

  // Re-walk the current query so the highlighted path and the suggestion list
  // always match what is typed; recompute when the query or the trie changes.
  // Recomputed each render (cheap for a small trie; a mutation forces a render
  // via bumpVersion, so these always reflect the current trie and query).
  const walk = walkPrefix(trie, query);
  const suggestions = autocomplete(trie, query, 8);
  const layout = trieLayout(trie);

  // The set of node ids on the highlighted prefix path (every "start"/"walk"
  // step lands on a node that is on the path; a "miss" step does not extend it).
  const pathIds = new Set<number>();
  for (const s of walk.steps) if (s.kind === "start" || s.kind === "walk") pathIds.add(s.nodeId);

  const matched = walk.node !== null;
  const total = countNodes(trie);

  const xOf = (x: number): number => PAD_X + (x / Math.max(1, layout.width - 1)) * (W - PAD_X * 2);
  const yOf = (depth: number): number => PAD_T + NODE_R + depth * LEVEL_GAP;
  const svgH = yOf(layout.depth) + NODE_R + 16;

  function onInsert(): void {
    const word = query.trim().toLowerCase();
    if (!word) return;
    const { created } = insert(trie, word);
    // insert() stamps new nodes with contiguous ids, so the ones it just made
    // are [nextId-created, nextId-1]. Re-walk the word and flag the path nodes
    // whose id falls in that range — those are exactly the nodes it had to add.
    if (created > 0) {
      const firstNewId = trie.nextId - created;
      const fresh = new Set<number>();
      const { steps } = walkPrefix(trie, word);
      for (const s of steps) if (s.nodeId >= firstNewId) fresh.add(s.nodeId);
      setFreshIds(fresh);
    } else {
      setFreshIds(new Set());
    }
    bumpVersion();
  }

  function onReset(): void {
    trieRef.current = build(SEED);
    setFreshIds(new Set());
    setQuery("");
    bumpVersion();
  }

  // Status line: what the current lookup found, plus the sharing payoff.
  const status = query
    ? matched
      ? `"${query}" is a path — ${suggestions.length} completion${suggestions.length === 1 ? "" : "s"} in the subtree below it. ${total} nodes total (shared prefixes stored once).`
      : `"${query}" — no match: the path breaks before the whole prefix is spelled. ${total} nodes total.`
    : `Type a prefix to walk the trie. ${total} nodes hold ${autocomplete(trie, "", Infinity).length} words — shared prefixes are stored once.`;

  return (
    <SimShell
      title="Trie autocomplete — spend the key one letter at a time"
      simKey="trie-autocomplete"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="trie-ctl">
          <label className="ss-field">
            prefix / word
            <input
              className="trie-input"
              type="text"
              value={query}
              onChange={(e) => {
                setFreshIds(new Set());
                setQuery(e.target.value.toLowerCase());
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onInsert();
              }}
              placeholder="e.g. car"
              autoComplete="off"
              spellCheck={false}
              aria-label="Prefix or word to look up in the trie"
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={onInsert}
            disabled={query.trim().length === 0}
            aria-label="Insert the typed word into the trie"
          >
            + insert word
          </button>
        </div>
      }
      footer={
        <div className="trie-foot">
          <div className="trie-suggest">
            <div className="trie-suggest-head">
              autocomplete
              <span className="trie-suggest-note">= collect the subtree under the prefix</span>
            </div>
            {query && !matched ? (
              <div className="trie-nomatch" role="status">
                no match — no edge for the next letter
              </div>
            ) : suggestions.length === 0 ? (
              <div className="trie-nomatch">no words below this prefix</div>
            ) : (
              <ul className="trie-suggest-list" aria-label={`Completions for "${query}"`}>
                {suggestions.map((w) => (
                  <li key={w}>
                    <button
                      type="button"
                      className="trie-chip"
                      onClick={() => {
                        setFreshIds(new Set());
                        setQuery(w);
                      }}
                      aria-label={`Fill input with ${w}`}
                    >
                      <span className="trie-chip-pre">{query}</span>
                      {w.slice(query.length)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="trie-legend" role="list" aria-label="Colour legend">
            <span className="trie-legrow" role="listitem">
              <span className="trie-swatch trie-swatch--node" aria-hidden="true" /> trie node
            </span>
            <span className="trie-legrow" role="listitem">
              <span className="trie-swatch trie-swatch--path" aria-hidden="true" /> prefix path
            </span>
            <span className="trie-legrow" role="listitem">
              <span className="trie-swatch trie-swatch--word" aria-hidden="true" /> word ends here
            </span>
            <span className="trie-legrow" role="listitem">
              <span className="trie-swatch trie-swatch--fresh" aria-hidden="true" /> just created
            </span>
          </div>
        </div>
      }
    >
      <svg
        className="trie-tree"
        viewBox={`0 0 ${W} ${svgH}`}
        role="img"
        aria-label={`Trie of ${total} nodes; the path for "${query}" is highlighted${matched ? "" : " until it breaks"}.`}
      >
        {/* edges first (parent → child) so nodes sit on top; an edge is "hot"
            when both endpoints are on the highlighted prefix path. */}
        {layout.edges.map((e) => {
          const onPath = pathIds.has(e.childId);
          return (
            <line
              key={`e${e.childId}`}
              x1={xOf(e.x1)}
              y1={yOf(e.y1)}
              x2={xOf(e.x2)}
              y2={yOf(e.y2)}
              stroke={onPath ? "var(--sem-control)" : "var(--line)"}
              strokeWidth={onPath ? 2.5 : 1.25}
            />
          );
        })}
        {/* nodes: root is a small dot; letter nodes carry their char; isWord
            nodes get a ring; path nodes fill orange; freshly inserted nodes
            flash green. */}
        {layout.nodes.map((n) => {
          const isRoot = n.id === 0;
          const onPath = pathIds.has(n.id);
          const isFresh = freshIds.has(n.id);
          const fill = isFresh
            ? "var(--sem-ok)"
            : onPath
              ? "var(--sem-control)"
              : n.isWord
                ? "var(--p4)"
                : "var(--s2)";
          return (
            <g key={`n${n.id}`}>
              {/* word marker ring */}
              {n.isWord && !isRoot && (
                <circle
                  cx={xOf(n.x)}
                  cy={yOf(n.y)}
                  r={NODE_R + 3}
                  fill="none"
                  stroke={onPath ? "var(--sem-control)" : "var(--sem-ok)"}
                  strokeWidth={2}
                />
              )}
              <circle
                cx={xOf(n.x)}
                cy={yOf(n.y)}
                r={isRoot ? 7 : NODE_R}
                fill={isRoot ? "var(--tx3)" : fill}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              {!isRoot && (
                <text
                  x={xOf(n.x)}
                  y={yOf(n.y) + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  fill={onPath || isFresh || n.isWord ? "var(--surface)" : "var(--tx)"}
                >
                  {n.char}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </SimShell>
  );
}
