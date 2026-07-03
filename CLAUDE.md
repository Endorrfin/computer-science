# CLAUDE.md — Computer Science: The Interactive Journey

Working guide and source of truth for every session in this repo. **Read this file fully
before starting any session.** Update the *Status / progress log* at the bottom at the end
of each session.

> Author/brand: **Vasyl Krupka · Ukraine**. Sibling project & proven playbook:
> `../Node-js guide` (its `CLAUDE.md` is the operational reference — same working method,
> same quality bar, same deploy pipeline). This guide is the next entry in the series.

---

## 1. Mission

A **comprehensive, interactive Computer Science guide** — the whole discipline told as one
bottom-up journey: **electron → logic gate → CPU → program → algorithm → theory → OS →
network → data → security → AI**. Every core entity must be *touchable*: live emulators,
steppable simulators, animated diagrams — not walls of text. Target verdict: "Masterpiece".

- **Audience & depth:** **Layered.** Every chapter teaches from zero (visual, intuitive —
  Crash Course energy) *and* carries a **Senior lens** (internals, trade-offs,
  interview-grade depth). A global **Depth toggle** switches lanes (see §6).
- **Independence:** each Part is **self-contained** — a user can take only Part 6 (OS).
  Every chapter opens with "Where you are in the stack" + a 30-second recap of what it
  assumes (with links). Cross-references are optional `seeAlso`, never prerequisites.
- **Language:** English (UI + content).
- **Code languages:** **TS-first**; **C** where the machine must feel physical
  (memory/pointers/layout); **Python** where it's the domain lingua franca (AI/ML);
  tiny **assembly** in the CPU chapters; **SQL** in databases.
- **Math:** visual-first; formal notation lives in collapsible **"Formal corner"** blocks;
  one optional **Math toolkit** on-ramp chapter.
- **History:** short **story hooks** inside chapters (Turing in computability, ARPANET in
  networks) — flavor, not filler. No dedicated history chapter.
- **Purity:** pure CS, stack-agnostic. No Node/Postgres/AWS anchoring (decided 2026-07-03).
- **Deploy:** static site on **GitHub Pages**, public repo, auto-published by GitHub Actions.
  Proposed repo name: **`computer-science`** → `https://<user>.github.io/computer-science/`
  (confirm with user at S1).
- **Sources of inspiration (not limits):** `_examples/` — CS50 (2023/2026) curricula,
  Crash Course CS #1–40, IT Fundamentals list, CS-discipline mind-map. Coverage decisions
  vs these sources are logged in §11.

## 2. Stack & key decisions (with why)

Mirror the Node-guide decisions — they are proven by a shipped sibling project:

- **Vite + React (latest stable) + TypeScript strict** — stateful simulators
  (play/pause/step), component reuse across ~35 chapters. **Web-verify current React/Vite/
  Node-LTS versions at S1** (cutoff caution); pin exact versions then.
- **No router library** — custom hash router (`#/part/<id>`, `#/chapter/<id>`, `#/map`,
  `#/review`, `#/interview`, `#/bosses`). Hash routing + `vite base:'./'` = works under any
  Pages sub-path.
- **All content static** — TS/JSON data modules imported at build time; no runtime fetches;
  works offline.
- **Single source of truth for content:** `src/data/*` (chapters rendered from data — never
  hand-written page HTML). Figures & sims referenced by **registry key** (`lib/registry.ts`).
- **Tooling/CI Node:** current LTS (verify at S1; Node-guide-era gotchas in §10 still apply).
- **localStorage only** for user state (progress, SRS scheduling, lens preference,
  boss badges) — no backend, exportable/importable as JSON.

## 3. Repo layout (target)

```
computer_science/                       # = git repo root; deploy publishes dist/ only
  index.html  package.json  vite.config.ts  tsconfig.json  eslint.config.js
  .github/workflows/deploy.yml          # Actions → Pages (LTS Node, npm ci, build, upload dist)
  .gitignore                            # node_modules, dist, AND _examples/ (reference assets)
  _examples/                            # existing reference material (NEVER ships, NEVER in git)
  public/   favicon.svg  og.png  .nojekyll
  src/
    main.tsx  App.tsx                   # layout + hash router
    theme/    tokens.css  global.css    # dark base + per-part accent spectrum (§7)
    data/
      curriculum.ts                     # SINGLE SOURCE OF TRUTH: parts + chapters + sections
      interview.ts                      # senior CS interview bank (tagged by chapter)
      katas.ts                          # in-browser exercises (tests + starters)
      bosses.ts                         # per-part boss challenges metadata
      decks.ts                          # SRS flashcard decks (generated from keyPoints + figures)
    components/
      layout/  TopBar  Sidebar  Toc  ProgressRings  LensToggle  Footer(brand)
      map/     StackMap  PartNode  Drawer        # the landing "stack" (§7) — clickable
      chapter/ ChapterPage  Section  Prose  Figure  CodeBlock  DataTable  Callout
               Compare  FormalCorner  RecapBox("what this assumes")  StoryHook
      sims/    <one folder per sim>              # registry-keyed interactive widgets
      study/   Flashcards  SrsReviewHub  PredictQuiz  InterviewBank  KataRunner  BossArena
    lib/     hashRouter.ts  search.ts  registry.ts  srs.ts(SM-2-lite)  progress.ts
             sandbox.ts(worker eval for katas)  utils.ts
  CLAUDE.md  (this file)
  INTERACTIVES.md                       # binding inventory of ALL interactives (§6 mandate)
```

## 4. Content / data model (the contract)

Extends the Node-guide schema with **lens lanes**, **bosses**, **katas**, **SRS**:

```ts
type Part = {
  id: string; order: number; name: string; accent: string;   // spectrum color (§7)
  tagline: string; blurb: string;
  bossId?: string;                     // capstone challenge (§6)
};
type Chapter = {
  id: string; part: string; order: number;
  title: string; tagline: string; readMins: { foundations: number; senior: number };
  storyHook?: { md: string };          // the history/narrative opener
  assumes: { chapterId: string; oneLiner: string }[];  // rendered as RecapBox — NOT prerequisites
  mentalModel: string;                 // the one picture to redraw from memory
  sections: Section[];
  keyPoints: string[];                 // feeds flashcards (SRS deck auto-generation)
  pitfalls: { title: string; body: string; lens: Lens }[];
  interviewIds: string[]; kataIds: string[];
  seeAlso: string[]; sources: { title: string; url: string }[];
};
type Lens = 'foundations' | 'senior' | 'both';
type Section = (
  | { kind:'prose';   md: string }
  | { kind:'figure';  fig: string; caption?: string }   // animated/steppable SVG component
  | { kind:'sim';     sim: string }                     // interactive widget registry key
  | { kind:'table';   head: string[]; rows: string[][]; caption?: string }
  | { kind:'code';    lang: 'ts'|'c'|'py'|'asm'|'sql'|'pseudo'; code: string; note?: string }
  | { kind:'callout'; tone:'tip'|'warn'|'senior'|'story'; title: string; md: string }
  | { kind:'formal';  title: string; md: string }       // collapsible Formal corner
  | { kind:'quiz';    quiz: string }                    // predict-the-behavior widget key
  | { kind:'compare'; a: string; b: string; rows: [string,string,string][] }
) & { lens?: Lens };                                    // default 'both'
```

**Lens rendering rule:** `foundations` mode hides `senior` sections/pitfalls and Formal
corners (collapsed count still visible as teaser — "3 senior blocks hidden"); `senior` mode
shows everything. Toggle is global, persisted, and switchable per-chapter inline.

## 5. Curriculum — 11 parts · 37 units (the skeleton)

> Sim keys in *(italics)*; **HERO** = flagship simulator. Every chapter also gets ≥1
> steppable animated figure and ≥1 predict-quiz even when not listed.

**P0 · Orientation** *(neutral)*
- 0a. **The Map** — what CS is, the discipline landscape (mind-map view), how this guide
  works (lens, bosses, review), the journey ahead *(interactive stack-map is the landing)*
- 0b. **Math toolkit** *(optional on-ramp)* — logic & sets, functions, combinatorics,
  probability, graph notation, induction & proof sketches *(birthday-paradox lab,
  combinatorics counter)*

**P1 · Information** — "everything is bits"
- 1. **Bits & numbers** — binary/hex, two's complement, integer overflow, IEEE-754
  *(HERO: bit-inspector — flip bits live on int & float lanes, watch value/overflow/precision)*
- 2. **Encoding the world** — ASCII→Unicode/UTF-8, colors & pixels, sound & sampling
  *(utf8-encoder, pixel-zoom, sampling/aliasing toy)*
- 3. **Compression & entropy** — information theory, RLE, Huffman, LZ, lossy (JPEG/MP3
  intuition) *(HERO: huffman-lab — type text, watch the tree build & bits shrink)*

**P2 · The Machine** — from electrons to a computer
- 4. **From electricity to gates** — switches→transistors, Boolean algebra, De Morgan, gate
  zoo *(HERO: logic-sandbox — drag-drop circuit builder with live signals)* ← **GOLDEN CHAPTER**
- 5. **Circuits that count** — half/full adders, ripple-carry, ALU, multiplexers
  *(build-an-adder guided lab, alu-visualizer)*
- 6. **Circuits that remember** — latches, flip-flops, clock, registers, RAM, memory
  hierarchy *(latch-playground, ram-grid addressing)*
- 7. **The CPU** — fetch-decode-execute, ISA, registers, control; write real programs
  *(HERO: **cpu-8bit** — full 8-bit CPU emulator: tiny assembler, step/run, watch
  PC/registers/RAM/flags — the guide's crown jewel)*
- 8. **Fast CPUs** — pipelining & hazards, caches L1-L3, branch prediction, superscalar,
  multicore, Moore's law *(pipeline-visualizer, cache-sim with access patterns)*
- 9. **GPUs & parallel hardware** — why GPUs exist, rasterization intuition, SIMD/parallel
  math (bridge to AI) *(rasterizer-toy: triangle→pixels; cpu-vs-gpu race)*

**P3 · Code** — how humans talk to machines
- 10. **From machine code to languages** — assembly→high-level, statements/control flow,
  **functions, the call stack & recursion** (mechanics, stack overflow), paradigms
  (imperative/OOP/FP) *(abstraction-elevator: same program at 4 levels; call-stack
  visualizer — watch frames push/pop through a recursive call)*
- 11. **Compilers & interpreters** — lexer→parser→AST→codegen, bytecode, JIT, type systems
  *(HERO: compiler-pipeline — type code, watch tokens→AST→bytecode→run live)*
- 12. **Software engineering** — abstraction & modularity, APIs, testing, versioning, how
  million-line systems stay sane *(dependency-graph toy)* — shorter chapter

**P4 · Algorithms & Data Structures** — the biggest part
- 13. **Big-O & algorithmic thinking** — growth, best/avg/worst, amortized
  *(HERO: growth-racer — n vs log n vs n² curves racing on real operation counts)*
- 14. **Linear structures** — arrays & memory layout, linked lists, stacks, queues, hash
  tables (collisions, load factor) *(hash-collision-lab, array-vs-list memory-access anim)*
- 15. **Trees & heaps** — BST, balancing intuition (AVL/RB), heaps, tries; B-trees teaser→ch.29
  *(bst-builder, heap-operations, trie-autocomplete)*
- 16. **Sorting & searching** — binary search, insertion/selection, merge/quick/heap,
  counting/radix, stability *(HERO: sorting-race — algorithms race on your data, step mode)*
- 17. **Graphs** — representations, BFS/DFS, Dijkstra, A*, MST, topological sort
  *(HERO: pathfinder — draw walls on a grid, race BFS vs Dijkstra vs A\*)*
- 18. **Design paradigms** — divide & conquer, greedy, dynamic programming, backtracking
  *(dp-table-filler: knapsack/LCS cell by cell; n-queens backtracking visual)*

**P5 · Theory** — the limits of computation
- 19. **Automata & regular languages** — FSMs, regex↔NFA/DFA, grammars, Chomsky hierarchy
  *(fsm-builder, regex→NFA visualizer)*
- 20. **Computability** — Turing machines, universality, the halting problem, Church-Turing
  *(HERO: turing-machine — tape + rules editor, run busy beavers)*
- 21. **Complexity** — P vs NP, NP-completeness, reductions, coping strategies
  *(brute-force-death-watch: grow n, watch runtimes explode; tsp-playground)*

**P6 · Operating Systems** — the great illusionist
- 22. **Processes & scheduling** — kernel/user mode, syscalls, processes vs threads, context
  switches, schedulers *(HERO: scheduler-sim — round-robin vs priority, watch the Gantt live)*
- 23. **Memory** — virtual memory, paging, TLB, stack vs heap, allocators, GC intuition
  *(address-translation stepper, page-fault visualizer)*
- 24. **Files & storage** — file systems, inodes, journaling, HDD vs SSD
  *(block-allocation/fragmentation visual)*
- 25. **Concurrency** — races, mutexes, semaphores, deadlock, classic patterns
  *(HERO: deadlock-lab — dining philosophers you can break and fix)*

**P7 · Networks** — computers, together
- 26. **How networks work** — layering (TCP/IP model), Ethernet & switching, IP & routing,
  DNS *(HERO: packet-journey — follow a packet hop-by-hop, TTL ticking)*
- 27. **TCP & UDP** — handshake, reliability, sliding window, congestion control, NAT
  *(tcp-lab: handshake + inject loss, watch retransmission & window)*
- 28. **The Web** — HTTP/1.1→2→3, TLS in one picture, caching/CDN, "URL→pixels" timeline
  *(url-journey end-to-end timeline)*

**P8 · Data** — remembering at scale
- 29. **Databases** — relational model & SQL, B-tree indexes, query planning, transactions,
  ACID & isolation levels, NoSQL landscape *(HERO: btree-lab — insert/split/search live;
  isolation-anomalies demo)*
- 30. **Distributed systems** — replication, partitioning, CAP & consistency models, clocks,
  consensus intuition (leader election) *(election-toy, cap-tradeoff explorer)*

**P9 · Security** — the adversarial mindset
- 31. **Cryptography** — Kerckhoffs, symmetric (AES intuition), hashing, RSA/ECC intuition,
  Diffie-Hellman, signatures, TLS tie-back *(HERO: dh-color-lab — key exchange as color
  mixing; hash-avalanche; caesar/vigenère cracker)*
- 32. **Security** — threat modeling, attack classes (injection, XSS/CSRF, memory safety,
  supply chain, social engineering), defense in depth, authn vs authz
  *(safe injection-sandbox, password-entropy meter)*

**P10 · Intelligence** — solid section, not a course (decided 2026-07-03)
- 33. **Machine learning** — taxonomy, features/loss/gradient descent, overfitting,
  train/test discipline *(HERO: neural-playground — tiny NN learns a 2D boundary before
  your eyes)*
- 34. **Modern AI & frontiers** — deep-learning stack, transformers & LLM intuition,
  embeddings, capabilities/limits/alignment, computability link *(tokenizer-toy,
  attention-heatmap)*

**P11 · Capstone**
- 35. **The whole picture** — the entire stack on one page (grand animated traversal:
  keypress→transistor→…→pixel), quantum & frontiers box, boss gallery, where to go next

## 6. The learning engine (what makes this guide unique)

Three signature systems (beyond the Node guide) + the proven aids:

1. **Depth lens** — the layered-audience decision made *structural*: a global
   Foundations/Senior toggle re-renders every chapter (§4). One guide, two courses.
2. **Boss challenges** — each part ends in an applied, hands-on challenge inside a hero sim:
   *P1: decode a mystery file* · *P2: program the 8-bit CPU to compute Fibonacci* ·
   *P3: make the mini-compiler run your program* · *P4: beat A\* on a maze / fill the DP
   table* · *P5: build a TM that recognizes a language* · *P6: fix the deadlocked
   philosophers* · *P7: debug the broken handshake* · *P8: choose indexes to hit the query
   budget* · *P9: break Vigenère, then do DH by hand* · *P10: train the net to 95%*.
   Completing a boss lights the part's badge on the stack map. This is what turns a wiki
   into a course.
3. **Spaced-repetition review hub** — flashcards auto-generated from `keyPoints` +
   mental-model figures; SM-2-lite scheduler in localStorage; landing shows "N cards due
   today"; review works across only-the-parts-you-study (respects independence).

Proven aids carried over: **predict-quizzes** inline in every chapter; **interview bank**
(senior CS questions, filterable by part/topic/level); **kata runner** — small TS exercises
(implement a stack, LRU cache, binary search without off-by-one, topo sort…) executed
in-browser in a sandboxed worker with instant tests (~15 katas at launch, grow
opportunistically); **progress model** — per-chapter completion, per-part rings on the map,
export/import JSON; **global search**; **mental-models gallery** ("can you redraw it?").

**Interactivity mandate (upgraded 2026-07-03, S0 — binding):**

- **Every core entity must be touchable** — live emulator, steppable simulator, or animated
  steppable figure. Prose exists to *frame* interactives, never to replace them.
- **The full inventory lives in `INTERACTIVES.md`** (root) — the binding contract:
  ~110 named interactives (17 HERO · ~55 micro · ~30 fig · 10 boss + quizzes). Registry keys
  are defined there first, then implemented. Changes go inventory-first.
- **No-wall-of-text rule:** max **2 consecutive `prose` sections** before a
  `sim`/`figure`/`quiz` block; every chapter ≥1 sim or steppable figure **per major
  concept**. Enforced by an automated **`qa:interactivity` gate** (data-lint over
  `curriculum.ts`, part of `npm run verify`) — violations fail CI.
- **Shared framework** (S1): `SimShell` (play/pause/step/speed/reset, keyboard, ARIA,
  reduced-motion→step), `FigureStepper` (animated SVG frames, no GIFs in-app),
  `PredictQuiz` (commit→reveal→sim replays the truth). Cross-sim visual continuity: the
  same RAM-grid/cache/packet components reappear across parts.
- Escape hatch (kept): where an interactive adds no real insight, a crisp steppable
  figure + table is the floor. Decoration for its own sake is banned.

## 7. Theme / brand — dark + layer spectrum

Dark base shared with the series (recognizable "Vasyl Krupka guide"), but **each part owns
an accent** — the journey renders as a warm→cool spectrum, bottom (silicon) to top (AI):

```
--bg:#0B0C0E  --surface:#121417  --s2:#171A1E  --line:#262B32  --tx:#F2F5F7  --tx2:#9AA7B4
P1 Information #FACC15 · P2 Machine #FB923C · P3 Code #A3E635 · P4 Algorithms #34D399
P5 Theory #2DD4BF · P6 OS #22D3EE · P7 Networks #38BDF8 · P8 Data #60A5FA
P9 Security #818CF8 · P10 Intelligence #A78BFA · P0/P11 neutral #94A3B8
```

- **Landing = the Stack Map**: a glowing vertical stack of the 11 parts (electron at the
  bottom, AI at the top), parts expand to chapters, progress rings + boss badges per part.
  This is the guide's visual signature.
- **Semantic palette inside diagrams/sims** (consistent everywhere, independent of part
  accents): **data=cyan · control/active=orange · memory/state=violet · error/blocked=red
  #F87171 · success/done=green #4ADE80**. Finalize + contrast-check at S1.
- Fonts: **Space Grotesk** (headings) · **Inter** (body) · **JetBrains Mono** (code/labels).
- Footer: **"Vasyl Krupka · Senior Fullstack Engineer"** + 🇺🇦. Inline SVG favicon (stacked
  layers glyph). Dark primary; light theme optional later.
- Accents are decorative identity; **all accent-on-bg text pairs must pass WCAG AA**.

## 8. Conventions (inherited from Node guide — all still binding)

- TS **strict** + `noUnusedLocals/Parameters`; **ESLint flat config**; `npm run verify` =
  typecheck + lint + qa + build; CI gates before deploy.
- Content edited **only** in `src/data/*`; figures/sims resolved via registry keys.
- **Accessibility:** keyboard nav, focus rings, ARIA on sims, `prefers-reduced-motion`
  (every sim/figure has a non-animated step fallback), contrast-checked palette.
- **Correctness:** every non-trivial claim verifiable; fill `sources` per chapter;
  **web-search version-sensitive facts** (HTTP/3 status, TLS versions, hardware numbers,
  AI landscape) at authoring time — never trust memory. Each session ends with
  typecheck + build + fact spot-check.
- Per user rule: mark in-code edits with `// CHANGED:`; propose change + why before doing it.

## 9. Deploy (GitHub Pages via Actions)

Same as Node guide: on push to `main` → checkout → setup-node (LTS) → `npm ci` →
`npm run build` → upload `dist/` → deploy-pages. Pages Source = GitHub Actions.
`vite base:'./'` + hash routing + `public/.nojekyll`. Confirm repo name at S1.

## 10. Gotchas / constraints (inherited — verified painful in the sibling repo)

- **`_examples/` must be excluded** from git & deploy (`.gitignore`).
- **Vite 8 uses Rolldown**; on Apple-silicon an npm optional-dep bug can leave the native
  binary missing (`…-darwin-arm64`) — reinstall platform package. CI (linux-x64) unaffected.
- **This Linux sandbox blocks `unlink`** on the mounted FS → Vite `emptyOutDir` fails on
  rebuild (EPERM). Workaround: fresh `--outDir` or `build.emptyOutDir:false`. User's Mac +
  CI are unaffected.
- **No browser in the sandbox** → validate via `tsc` + `vite build` + unit checks; no
  screenshots of the running app.
- Prefer `mv`/overwrite over `rm` in the sandbox.
- Kata runner: eval user TS **only** inside a sandboxed Worker (no DOM, time-boxed,
  `importScripts` blocked). Never `eval` in the main thread.

## 11. Coverage decisions vs `_examples` sources (logged 2026-07-03)

- **CS50:** Scratch→ch.10 (abstraction levels); C→C-snippets in P2/P6; arrays/algorithms/
  memory/data-structures→P4+P6; Python→P10 snippets; SQL→ch.29; web→ch.28; AI→P10;
  Flask/"build a web app" practicum → **out of scope** (this is CS, not web-dev training).
- **Crash Course #1–40:** #1–17 → P1–P3; #18–22 → P6+ch.3; #23/#27 (screens/3D graphics)
  → ch.9 (GPUs & rasterization); #28–33 → P7+P9; #34–36 → P10; #15 (Turing) → ch.20
  story hook; #24–26/#37–40 (history/consumerism/robots/psychology/ed-tech) → **out of
  scope** (not core CS; possible future "satellites").
- **IT Fundamentals:** hardware/OS/networking/db/security/virtualization-cloud →
  covered conceptually (ch.30 touches cloud-scale); Windows/Linux administration,
  troubleshooting, DevOps → **out of scope** (ops training, not CS).
- **Mind-map:** Foundations/Theory quadrant → P4+P5; Builders quadrant → P3 (+ch.12);
  Brains quadrant → P8+P10; cybersecurity → P9; quantum → ch.35 frontier box;
  bioinformatics/robotics/HCI-UX → **out of scope** (frontier box mentions).

## 12. Session roadmap (~16–19 sessions; pattern: golden standard first, then batch)

- **S0 · Planning** *(this session)* — decisions locked (3 AskUserQuestion rounds), this
  CLAUDE.md written. ✅
- **S1 · Scaffold + golden chapter** — verify current versions (React/Vite/Node LTS); app
  shell, theme/spectrum tokens, hash router, layout, registry, deploy workflow, favicon;
  **shared interactivity framework: `SimShell` + `FigureStepper` + `PredictQuiz` +
  `qa:interactivity` gate** (§6 mandate — this framework is what makes ~90 interactives
  affordable); **Stack-Map landing** (clickable, content may stub); **ch.4 "From
  electricity to gates" fully built + logic-sandbox HERO** + its quiz/flashcards/boss
  stub = the quality bar. First Pages deploy.
- **S2 · P1 Information** — ch.1–3 (bit-inspector HERO, huffman-lab HERO) + P1 boss.
- **S3 · P2 machine core** — ch.5–6 (adder/ALU, latch/RAM sims).
- **S4 · P2 CPU** — ch.7 **cpu-8bit HERO** (assembler+emulator) + P2 boss (Fibonacci).
- **S5 · P2 fast hardware** — ch.8–9 (pipeline, cache, rasterizer) — closes P2.
- **S6 · P3 Code** — ch.10–12 + compiler-pipeline HERO + P3 boss.
- **S7 · P4 A&DS I** — ch.13–14 (growth-racer HERO, hash-collision-lab) + kata runner v1.
- **S8 · P4 A&DS II** — ch.15–16 (tree sims, **sorting-race HERO**).
- **S9 · P4 A&DS III** — ch.17–18 (**pathfinder HERO**, dp-table) + P4 boss.
- **S10 · P5 Theory** — ch.19–21 (fsm-builder, **turing-machine HERO**) + P5 boss.
- **S11 · P6 OS I** — ch.22–23 (**scheduler-sim HERO**, paging stepper).
- **S12 · P6 OS II** — ch.24–25 (**deadlock-lab HERO**) + P6 boss.
- **S13 · P7 Networks** — ch.26–28 (**packet-journey HERO**, tcp-lab) + P7 boss.
- **S14 · P8 Data** — ch.29–30 (**btree-lab HERO**, election-toy) + P8 boss.
- **S15 · P9 Security** — ch.31–32 (**dh-color-lab HERO**, injection-sandbox) + P9 boss.
- **S16 · P10 Intelligence** — ch.33–34 (**neural-playground HERO**) + P10 boss.
  *(web-verify AI landscape facts.)*
- **S17 · P0 + P11** — ch.0a/0b (math toolkit) + ch.35 grand traversal + boss gallery.
- **S18 · Learning engine completion** — SRS review hub, interview bank filled (~60 Q),
  remaining katas, progress export/import, global search.
- **S19 · Polish & ship** — a11y/mobile/perf pass, OG image, About page, QA integrity gate,
  final deploy. *(Sessions may merge if velocity allows; heroes never ship half-done.)*

---

## Status / progress log

- **2026-07-03 · S0 (planning)** — Requirements locked in 3 question rounds: layered
  intro→senior with Depth-lens; transistor→AI journey spine; English; TS-first+C/Py;
  dark + layer-spectrum brand; one app with self-contained parts; full learning engine
  (lens/bosses/SRS/quizzes/interview/katas); AI = solid section not course; visual-first
  math + Formal corners; story hooks not history chapters; pure CS (no user-stack
  anchoring); GitHub Pages public. Skeleton: 11 parts / 37 units / 17 hero sims.
  This CLAUDE.md created.
- **2026-07-03 · S0 (completion)** — User sign-off on skeleton with one directive
  reinforced: **visualization first — every core entity touchable; target "Masterpiece"**.
  Delivered: `INTERACTIVES.md` (binding inventory: 17 HERO · ~55 micro · ~30 fig ·
  10 boss challenges, per-chapter, with registry keys + shared-framework spec);
  §6 upgraded to a binding Interactivity mandate (no-wall-of-text rule +
  `qa:interactivity` CI gate); S1 scope extended with the SimShell/FigureStepper/
  PredictQuiz framework. Recursion & call stack added to ch.10 (gap found in
  verification). **S0 CLOSED. Next: S1 — scaffold + golden chapter (ch.4 +
  logic-sandbox).** Repo name confirmed by user: **`computer-science`**.
- **2026-07-03 · S1 (scaffold + golden chapter)** — Versions verified & pinned: Vite 8.1.3
  (Rolldown) · React 19.2.7 · TS ~5.9.3 (TS 6.0 exists; held back one minor for ecosystem
  maturity — ts-eslint peer allows <6.1, revisit ~S6) · ESLint 10.6 flat · CI Node 24
  (Active LTS; sandbox runs 22 — scripts use `--experimental-strip-types`, works on both).
  Infra mirrored from the sibling Node-guide (eslint flat config, `tsc && vite build`,
  gated deploy.yml, hash router, Google Fonts). Shipped: full app shell + dark/spectrum
  theme (tokens per §7, WCAG-checked) · Stack-Map landing (rings, boss badges, expandable
  parts, spectrum spine) · content contract in `lib/types.ts` + `curriculum.ts` with all
  11 parts / 37 chapters (36 stubs carry `plannedSession`) · shared framework: **SimShell**
  (transport, speed, keyboard, ARIA live, reduced-motion→step) + **FigureStepper** +
  **PredictQuiz** (commit→reveal, persisted) + **Flashcards** (keyPoints "front — back"
  convention — NEW, documented in types.ts) · **ch.4 fully authored** (story hook, lens-
  tagged sections, formal corner, NAND/NOR compare, 5 pitfalls, 10 keyPoints, 6 interview
  Qs, 6 sources — YouTube ids web-verified) · **logic-sandbox HERO** (tick-based gate-delay
  model, drag/click-click wiring, live truth table with probe column + row-click, 4 presets
  incl. oscillator, 3 NAND challenges w/ validator + badge persist) · transistor-switch
  fig (5 frames) · demorgan-flip micro · `qa:interactivity` gate (mandate + integrity,
  in `verify` + CI) · `test-logic.ts` engine truth-tests (16 checks: gate semantics,
  settle, floating-input, oscillation, challenge validation incl. canonical 4-NAND XOR).
  **verify = typecheck ✓ lint ✓ (2 benign fast-refresh warns) qa ✓ test 16/16 ✓ build ✓**
  (bundle: react-vendor 190 KB + app 59 KB + per-sim chunks 3–16 KB). Committed on top of
  user's S0 init commit (5674466, 51 files). NEW gotcha for §10: the sandbox unlink-block
  also hits `.git` lock files — workaround: `mv` lock to `.git/trash/` (rename allowed);
  harmless `tmp_obj_*` clutter accumulates in `.git/objects` (run `git gc` on the Mac
  occasionally). NOT in sandbox-testable scope: real-browser interaction pass (no browser
  here) — do a 5-min manual QA of the sandbox after first deploy. **S1 CLOSED pending
  user push** (repo `computer-science`, Pages → GitHub Actions). **Next: S2 — P1
  Information: ch.1–3, bit-inspector HERO, huffman-lab HERO, P1 boss.**
