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
- **Session hand-off (user rule, added after S1):** every session / change-set ends with a
  suggested **branch name**, **commit message**, and a **1–2-line description**. Default:
  Claude stages the changes and the user commits/merges on the Mac (sandbox `git checkout`
  is unlink-constrained — see §10); Claude commits directly only when asked.

## 9. Deploy (GitHub Pages via Actions)

Same as Node guide: on push to `main` → checkout → setup-node (LTS) → `npm ci` →
`npm run build` → upload `dist/` → deploy-pages. Pages Source = GitHub Actions.
`vite base:'./'` + hash routing + `public/.nojekyll`. Confirm repo name at S1.

## 10. Gotchas / constraints (inherited — verified painful in the sibling repo)

- **`_examples/` must be excluded** from git & deploy (`.gitignore`).
- **Vite 8 uses Rolldown**; an npm optional-dep bug can leave the native binding missing for
  the current platform — reinstall it. On the Mac it's `@rolldown/binding-darwin-arm64`; in
  **this sandbox (linux-arm64)** it's `@rolldown/binding-linux-arm64-gnu` (S2:
  `npm i @rolldown/binding-linux-arm64-gnu@<rolldown ver> --no-save` unblocks `vite build`).
  CI (linux-x64) unaffected.
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
- **S17 · P0 + P11** — ch.0a/0b (math toolkit) + ch.35 grand traversal + boss gallery. ✅ **CONTENT-COMPLETE:
  all 11 parts / 37 units live** (discipline-map, combinatorics-counter, birthday-paradox, truth-table,
  grand-traversal HERO + boss-gallery; 82 sims · 37 figs · 38 quizzes · 183 interview Qs · 59 katas).
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
- **2026-07-03 · S2 (P1 · Information)** — Whole of Part 1 built to the ch.4 golden bar.
  **Three chapters authored** (stubs → full) in `curriculum.ts`: **ch.1 Bits & numbers**
  (story: Shannon/Tukey coin "bit"; two's complement, overflow, IEEE-754; formal corner +
  int-vs-float compare), **ch.2 Encoding the world** (story: Morse counting type cases;
  ASCII→Unicode→UTF-8, images, sampling; UTF-8 templates formal corner), **ch.3 Compression
  & entropy** (story: Huffman's dropped assignment; entropy floor, Huffman, RLE, LZ77, lossy;
  Kraft/source-coding formal corner). Each: story hook, RecapBox, mental model, lens-tagged
  sections (≤2 prose run), ≥5 keyPoints, 4 pitfalls, ≥4 sources (web-verified), flashcards.
  **2 HERO sims** — `bit-inspector` (int lane: 8/16/32-bit, signed/unsigned, click-to-flip,
  MAX+1 wrap animation, two's-comp mirror; float lane: colored sign/exp/mantissa fields,
  live snap-to-representable, 0.1+0.2, ULP gap) and `huffman-lab` (freq bars → transport-
  stepped tree assembly → shrink meter → bitstream; **boss mode hosts P1 "decode the mystery
  file"** → `markChallengeDone("boss-p1")`, badge *Bitreader*). **6 micros** — base-converter,
  utf8-encoder, pixel-zoom, sampling-toy, rle-visualizer, lz-window. **3 figs** —
  float-number-line, unicode-planes (Unicode 17.0 / 297,334 assigned, web-verified; 18.0
  Sept 2026), entropy-meter. **3 predict-quizzes** (overflow-, encoding-, compress-predict).
  **15 interview Qs** (iv-ch1..3-*). **4 pure engines** (`bit-inspector/model`,
  `utf8-encoder/model`, `compression/model`, `huffman-lab/model`) + **`scripts/test-info.ts`
  (66 truth-tests: two's-complement round-trips, IEEE-754 known values & bit round-trip,
  UTF-8 byte sequences + the char/unit/byte trap, entropy/RLE/LZ77 round-trips, Huffman
  prefix-free + Shannon bound + boss decode)**, wired into `npm test`. registryKeys/registry
  extended (10 sims, 4 figs). New P1 CSS block in `global.css` (semantic palette, WCAG,
  reduced-motion inherited). **verify = typecheck ✓ · lint ✓ (same 2 benign fast-refresh
  warns) · qa ✓ (4 live chapters, mandate holds) · test ✓ (16 logic + 66 info) · build ✓**
  (built to fresh `dist-s2`: 67 modules, CSS 36.5 KB, per-sim chunks 2.7–15.6 KB, react-
  vendor 190 KB — the `dist/` unlink block is sandbox-only). §10 updated with the linux-arm64
  Rolldown binding fix. NOT sandbox-testable: real-browser interaction pass — 5-min manual QA
  after deploy (bit-flipping, huffman tree animation, boss decode, sliders). **S2 CLOSED
  pending user commit. Next: S3 — P2 machine core: ch.5 (adders/ALU) + ch.6 (latches/RAM).**
- **2026-07-03 · S2 hotfix (chapter pages crashed the browser)** — Post-merge browser QA:
  *every* chapter (ch.1–4) hung then died with Chrome "Aw, Snap!" (renderer OOM). Root
  cause was a **latent S1 bug in `lib/md.tsx`**, never caught because nothing was ever opened
  in a real browser (typecheck/lint/qa/Node-tests all pass regardless): `renderInline` used a
  single **module-level global (`/g`) regex** *and recursed* for `**bold**`; the recursive
  call reset the shared regex's `lastIndex`, so the outer `exec` loop re-matched the same bold
  forever → array grew → OOM. Any `**bold**` text triggered it — i.e. all chapters. Fix:
  extracted a pure, React-free tokenizer **`lib/mdInline.ts`** that builds a **fresh regex per
  call** (independent `lastIndex`) + a zero-length-match guard; `md.tsx` now renders those
  tokens. Added **`scripts/test-md.ts`** (12 checks — bold/italic/code/link/nested/multi-bold
  all must *terminate*) wired into `npm test`, so this can never regress silently. **verify =
  typecheck ✓ · lint ✓ · qa ✓ · test ✓ (16 logic + 66 info + 12 md) · build ✓ (68 modules).**
  Lesson for §8/§10: Node gates can't catch render-time infinite loops — **a real-browser
  smoke test of at least one chapter is now mandatory before closing any session.**
- **2026-07-05 · S3 (P2 · machine core)** — ch.5–6 built to the ch.4 golden bar; Part 2's
  compute + memory foundation now stands on ch.4's gates. **ch.5 Circuits that count**
  (story: Stibitz's 1937 kitchen-table "Model K" adder): half → full → 4-bit ripple-carry,
  two's-complement subtraction (`A + ~B + 1`, one adder does both), the ALU
  (ADD/SUB/AND/OR/XOR/CMP) and its Z/N/C/V flags with the C-vs-V distinction, the
  multiplexer; formal corner (generate/propagate → carry-lookahead seed, `V = Cₙ ⊕ Cₙ₋₁`),
  half-vs-full compare, 4 pitfalls, 10 keyPoints, 5 sources (web-verified). **ch.6 Circuits
  that remember** (story: the 1918 Eccles–Jordan flip-flop): feedback = memory, SR latch
  (cross-coupled NOR + the forbidden state), gated D latch, edge-triggered D flip-flop + the
  clock (why machines are synchronous), registers, RAM = registers + address decoder, SRAM
  (6T) vs DRAM (1T1C + refresh), the memory hierarchy; formal corner, latch-vs-flip-flop
  compare, 4 pitfalls, 10 keyPoints, 5 sources. **4 micro sims** — `build-an-adder` (guided
  half→full→ripple; animated carry sweep via `useSimClock`; try 1111+0001), `alu-visualizer`
  (op select, live Z/N/C/V, signed/unsigned readouts, reactive), `latch-playground` (SR
  latch stepped signal-by-signal to show the loop settle + hold; D-flip-flop CLK/D/Q
  waveform with rising-edge capture), `ram-grid` (binary address → one-hot decoder → cell;
  read/write bytes; 3/4/5-wire bus shows the doubling law — **reused ch.8/14/23**). **2 figs**
  — `mux-router` (4:1 select→path), `memory-hierarchy` (register→L1→L2→L3→RAM→SSD as distance;
  "if a register were 1 s…" scaling — reused ch.8/14/23); both delegated to a subagent, then
  reviewed. **2 predict-quizzes** (`adder-predict`, `latch-predict`). **10 interview Qs**
  (iv-ch5/6-*). **2 pure engines** — `sims/machine/arith.ts` (halfAdder/fullAdder/rippleAdd
  with carry trace, `alu` + flags) and `sims/machine/memory.ts` (SR/D latch, D flip-flop,
  register, RAM) — plus **`scripts/test-machine.ts` (61 truth-tests: adder columns, ripple
  carry-sweep + wrap, ALU flag corners incl. 127+1 V-overflow / 200+100 C-carry / signed
  SUB borrow, SR set/reset/hold/forbidden, edge-only DFF capture, RAM round-trip + one-hot +
  the 32-bit capacity law)**, wired into `npm test`. registryKeys/registry → **14 sims, 6
  figs**; new P2-machine CSS block in `global.css` (semantic palette, reduced-motion
  inherited). **Adversarial review** (subagent + web search): engines, figures and prose all
  confirmed correct; historical facts verified (Stibitz Nov 1937 · Eccles–Jordan 1918 ·
  74181 1970 first single-chip ALU · latency ladder). Two fixes from it: (1) **latent bug** —
  `ramCapacityBytes` used `1 << addrBits`, and JS masks the shift mod 32 so `1<<32 === 1`
  (returned **1** for the chapter's own "32-bit → 4 GiB" headline); now `2 ** addrBits`,
  locked with a test. (2) softened `iv-ch6-4` to credit the **power/heat wall** (not just the
  critical path) for the ~5 GHz plateau — consistent with ch.4. **verify = typecheck ✓ ·
  lint ✓ (same 2 benign fast-refresh warns in md.tsx/gateShapes.tsx) · qa ✓ (6 live chapters,
  mandate holds; 14 sims · 6 figs · 6 quizzes · 29 interview Qs) · test ✓ (16 logic + 66 info
  + 12 md + 61 machine) · build ✓** (fresh `dist-s3`: 76 modules, CSS 45.2 KB, new per-sim
  chunks 3.6–7.7 KB, react-vendor 190 KB). Sandbox `rm`/unlink still blocked → temp
  `dist-s3/` can't be deleted here but is gitignored (`dist-*`); harmless. NOT sandbox-
  testable: real-browser interaction pass — **5-min manual QA after deploy** (carry ripple
  play/step; ALU presets flip the right flags; SR latch step-settle + DFF waveform; RAM
  read/write + decoder one-hot; both figures auto-play). **S3 CLOSED pending user commit.
  Next: S4 — P2 CPU: ch.7 `cpu-8bit` HERO (mini-assembler + emulator) + P2 boss (Fibonacci).**
- **2026-07-05 · S4 (P2 · the CPU)** — ch.7 built to the golden bar; Part 2's compute (ch.5
  ALU) and memory (ch.6 registers/RAM) are finally wired into a running machine. **ISA
  decision** (user asked for the best-practice recommendation): **Von Neumann accumulator,
  Ben-Eater/SAP-1 lineage** — 16-byte RAM shared by code+data, **one-byte instructions**
  (4-bit opcode + 4-bit operand), registers **A** (accumulator) · **B** (ALU operand latch) ·
  **PC · IR · MAR** + **Z/N/C/V** flags, **16 opcodes** (LDA/LDI/STA/ADD/SUB/AND/OR/JMP/JZ/
  JNZ/JC/JN/CMP/OUT/HLT). Datapath animation depth (user pick): **micro-step / bus-transfer
  T-states**. **ch.7 The CPU** (story: Manchester **Baby**, 21 Jun 1948 — Kilburn's
  17-instruction program found the highest proper factor of 2¹⁸ by *repeated subtraction*,
  web-verified; the same no-multiply trick the chapter's Multiply preset uses): stored-program
  idea, fetch–decode–execute, the control unit + clock (micro-steps), the ISA + full
  instruction-set table, loops=backward JMP / if=conditional-jump-on-flags, building multiply
  from adds, **Von Neumann vs Harvard** compare, formal-corner RTL (`MAR←PC; IR←RAM[MAR];
  PC←PC+1; …`), 4 pitfalls, 9 keyPoints, **5 sources** (Baby, von Neumann/EDVAC 1945, Crash
  Course CS #7, nand2tetris P5, Ben Eater 8-bit — all web-verified). **cpu-8bit HERO**
  (`sims/cpu-8bit/`): assembler editor → assembles **into** the 16-byte RAM panel; register
  file + OUT log; **micro-stepped datapath** (`DatapathView`) whose buses/registers/ALU/RAM
  glow per T-state; transport = step (one micro-step) · step-instruction · run-to-end ·
  play/speed; **4 presets** (add · countdown · multiply-by-adding · Fibonacci); **boss mode**
  validates the OUT stream's Fibonacci prefix → `markChallengeDone("boss-p2")`, badge
  *Machine Whisperer*. **datapath [fig]** (`figures/Datapath.tsx`, FigureStepper, 6 frames =
  one ADD micro-op by micro-op) + **register-predict quiz** (3 Qs) + **5 interview Qs**
  (iv-ch7-1..5). **New engine `sims/machine/cpu.ts`** (ISA + two-pass symbolic assembler +
  micro-step fetch/decode/execute; reuses `arith.ts` `alu()` for the ALU + flags) and
  `cpu-8bit/presets.ts` (single source of truth for preset asm, locked by tests) +
  **`scripts/test-cpu.ts` (72 checks: opcode round-trip, assembler labels/data/error guards +
  code/data `kind` tagging, micro-step mechanics, flags via the ch.5 ALU, every preset's exact
  OUT stream incl. Fibonacci 1,1,…,233 → then 121 from the 144+233=377 8-bit overflow, boss
  validation)**, wired into `npm test`. registryKeys/registry → **15 sims, 7 figs**; new
  **P2-CPU CSS block** in `global.css` (semantic palette, reduced-motion inherited).
  **Adversarial review** (subagent ran the engine independently + web-searched every fact):
  **zero bugs, zero factual errors**. Two items actioned from it: (1) **latent bug** — the RAM
  panel's code-vs-data colouring used a fragile regex that mis-read a *labelled* data line
  (`total: 0`) as code; fixed by tagging each assembled byte `kind:"code"|"data"` in the
  assembler, locked with a test; (2) **prose honesty** — the 144+233 overflow also raises **V**
  (both operands' top bits set), not only C; the boss prose now says so (a C-vs-V teaching
  beat) and the `JC` summary/table wording tightened "carry/overflow out" → "carry out of the
  top bit". **verify = typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓ (7 live chapters;
  15 sims · 7 figs · 7 quizzes · 34 interview Qs) · test ✓ (229 green checks across 5 suites;
  test-cpu 72) · build ✓** (fresh `dist-s4v`: CpuEmulator 24.3 KB/8.2 gzip · Datapath 3.9 KB ·
  CSS 53.7 KB · react-vendor 190 KB). Sandbox `unlink` still blocked → temp `dist-s4*` can't be
  deleted (gitignored `dist-*`, harmless); the review's throwaway trace scripts were `mv`'d into
  `_test_ops/` (gitignored + eslint-ignored) since `rm` is blocked; the `.git/index.lock`
  warning on `git status` is the known sandbox stale-lock (Mac/CI unaffected). NOT
  sandbox-testable: real-browser interaction pass — **5-min manual QA after deploy** (load a
  preset → see it assemble into the RAM grid; single-step and watch the datapath bus + register
  glow one T-state at a time; step-instruction / run-to-end; flags update on ALU ops; edit +
  assemble&load; boss mode: write Fibonacci → the 1…55 checklist lights → *Machine Whisperer*
  badge). **S4 CLOSED pending user commit. Next: S5 — P2 fast hardware: ch.8 (pipeline, cache,
  branch prediction) + ch.9 (GPUs, rasterizer) — closes Part 2.**
- **2026-07-05 · S5 (P2 · fast hardware — PART 2 COMPLETE)** — ch.8–9 built to the golden
  bar; the machine is now finished end to end: electron → gate → ALU → CPU → fast CPU →
  GPU. **Two modeling decisions** (user asked for the best-practice recommendation):
  (1) `pipeline-visualizer` runs the **canonical 5-stage RISC** (IF/ID/EX/MEM/WB) with
  hazards shown as stall bubbles and **forwarding as a Senior-lens toggle** — *not* the ch.7
  accumulator ISA, whose funnel-through-A hazards are atypical; (2) `cache-sim` is
  **direct-mapped + a line-size slider** (associativity/replacement live in a Senior
  callout) for the cleanest spatial-locality/conflict lesson. **ch.8 Fast CPUs** (story:
  Intel **Tejas** cancelled **7 May 2004** — a 90 nm sample drew **150 W at 2.8 GHz** against
  a ~10 GHz roadmap, forcing the multicore pivot; web-verified): pipelining + the three
  hazards + forwarding, branch prediction/speculation (2-bit saturating counter), the
  **memory wall** + caches + temporal/spatial locality, **Moore ≠ Dennard** (density kept
  doubling, per-transistor power stopped ~2005), multicore + **Amdahl's law**; formal corner
  (pipeline speedup CPI→1 + Amdahl), ILP-vs-TLP compare, latency-ladder table, 4 pitfalls,
  7 keyPoints, 7 sources. **ch.9 GPUs & parallel hardware** (story: **AlexNet, 2012**, trained
  on two GTX 580s — the graphics card becomes the engine of AI): why GPUs exist (drawing is
  embarrassingly parallel), rasterization via **edge functions** (= barycentric weights),
  the CPU-vs-GPU bet (latency vs throughput; **SIMT**/warps/divergence/coalescing), when a
  GPU wins/loses (parallel + arithmetic-intensive + resident; launch/PCIe caveats), and the
  **bridge to AI** (a neural net is matrix-multiply = the same parallel shape); formal corner
  (arithmetic intensity / roofline — sum ≈ 0.25 FLOP/byte vs matmul ∝ n), CPU-vs-GPU compare,
  4 pitfalls, 6 keyPoints, 6 sources. **4 sims** — `pipeline-visualizer` (stage×cycle
  occupancy chart, 4 presets, forwarding toggle, live CPI/stall/flush), `cache-sim`
  (direct-mapped, 3 access patterns, line-size 1/2/4, hit/miss + hit-rate; reuses the ch.6
  RAM-grid visual language), `rasterizer-toy` (drag-to-reshape triangle, scanline fill,
  wireframe/filled/depth), `cpu-vs-gpu-race` (1 fast lane vs 1024, animated race with
  launch/transfer overhead + winner). **2 figs** — `branch-predictor` (4-state 2-bit FSM
  stepped over a loop) + `gfx-pipeline` (vertices→pixels, reusing the raster engine);
  `memory-hierarchy` fig **reused** in ch.8. **5 pure engines** — `sims/fast-cpu/{pipeline,
  cache,branch}.ts` + `sims/gpu/{raster,parallel}.ts` — plus **`scripts/test-fast-cpu.ts`
  (54 checks: load-use = 1 stall fwd / 2 no-fwd, RAW chain forwarding erases stalls, taken
  branch = 2 flushes, closed-form cycles; direct-mapped seq hitRate = 1−1/line, strided/
  random worse, conflict thrash; 2-bit < 1-bit mispredicts + saturation)** and
  **`scripts/test-gpu.ts` (24 checks: rasterizer coverage/barycentric-sum/degenerate/
  bresenham/wireframe; race CPU-wins-small / GPU-wins-large / transfer lowers speedup /
  waves; Amdahl)**, both wired into `npm test`. registryKeys/registry → **19 sims, 9 figs**;
  new **P2 fast-hardware CSS block** in `global.css`. **Adversarial review** (subagent ran
  every engine independently + web-verified all hardware/history facts): **engines & math
  correct, all facts confirmed, figures match their engines, quiz indices correct**. Three
  items actioned: (1) **blocking** — `gfx-pipeline` said "hundreds of fragments" while the
  10×7 figure shows **16**; reworded (figure + curriculum caption) to "a handful here,
  millions in a real frame"; (2) arithmetic-intensity byte model made **consistent** (4-byte
  floats throughout → matmul intensity n/6 FLOP/byte, story unchanged); (3) `test-gpu` depth
  assertion tightened 0.12 → 0.15 (DEFAULT_TRI's true min z). **verify = typecheck ✓ · lint ✓
  (0 errors, 0 warnings) · qa ✓ (9 live chapters; 19 sims · 9 figs · 9 quizzes · 44 interview
  Qs) · test ✓ (~302 green checks across 7 suites; +test-fast-cpu 54, +test-gpu 24) · build ✓**
  (fresh `dist-s5v`: PipelineVisualizer 7.1 KB · CacheSim 5.8 KB · BranchPredictor 6.0 KB ·
  RasterizerToy 3.8 KB · CpuVsGpuRace 4.4 KB · GfxPipeline 3.8 KB · react-vendor 190 KB).
  Sandbox `unlink` still blocked → temp `dist-s5*` gitignored (harmless); review probes in
  `_test_ops/`. Note: S1 flagged a **TS 6.0 / ts-eslint peer revisit ~S6** — worth a look
  next session. NOT sandbox-testable: real-browser pass — **5-min manual QA after deploy**
  (pipeline presets fill diagonally; forwarding removes bubbles; taken branch flushes; cache
  patterns + line-size swing the hit rate; drag the rasterizer triangle + depth mode; race
  crossover + PCIe toggle; branch-predictor & gfx-pipeline auto-play). **PART 2 COMPLETE —
  merged by user (dist-s* cleaned). Next: S6 (full, fresh session) — P3 Code: ch.10–12 +
  compiler-pipeline HERO + P3 boss (Language Smith).** Decision teed up at S6 kickoff (user
  chose full-scope; confirm exact grammar then): **mini-language = small imperative** —
  `let`, assignment, `+ − × ÷`, comparisons, `while`, `print` — compiling **source → tokens →
  AST → stack-VM bytecode** (Crafting-Interpreters-style; fits the boss's "vars + loop that
  computes a target"). Also fold in the **TS 6.0 / ts-eslint peer revisit** at the start of S6.
- **2026-07-05 · S6 (P3 · Code — PART 3 COMPLETE)** — ch.10–12 built to the golden bar; the
  guide now climbs electron → … → CPU → **language**. **Kickoff decisions** (user asked for the
  best-practice recommendation on both): grammar = **imperative core + if/else** (`let`,
  assignment, `+ − × ÷ %`, comparisons, `and/or/not`, `while`, `if/else`, `print`), **integer-only,
  one flat scope, flat stack-VM, NO user functions** — recursion/call-frames are deliberately
  ch.10's `call-stack-viz` story, keeping a clean teaching boundary and a stack-VM that contrasts
  with ch.7's accumulator CPU; boss = **print a target (55) via a variable + loop**, validated by
  running the REAL VM (mirrors the ch.7 Fibonacci boss). **TS 6.0 revisit → HELD at ~5.9.3**:
  `typescript-eslint@8.62.1` still caps its peer at `typescript <6.1.0`, so TS 6.0 sits at the edge
  with zero headroom; bumping a compiler major mid-content-session is pure risk for no needed
  feature — revisit at a boundary (S19 polish). No package.json change. **ch.10 From machine code
  to languages** (story: Grace Hopper's A-0, 1952, coining "compiler"): the abstraction elevator,
  structured control flow → ch.7 jumps, functions + the call stack (the CALL/RET ch.7 lacked),
  recursion + stack overflow, paradigms; formal corner (activation records, O(n) depth vs O(φⁿ)
  calls), paradigm table, 4 pitfalls, 7 keyPoints, 4 sources. **ch.11 Compilers & interpreters**
  (story: FORTRAN 1957, Backus's optimizing compiler beating the "can't match assembly" skeptics):
  the four-stage pipeline, lexer→parser (precedence in the tree)→codegen (stack VM)→run, compiler
  vs interpreter, the JIT, a *Reflections on Trusting Trust* callout; formal corner (BNF grammar →
  recursive descent), compiler-vs-interpreter compare, 4-stage table for `2+3*4`, 4 pitfalls, 6
  keyPoints, 4 sources. **ch.12 Software engineering** (lighter; story: NATO Garmisch 1968, the
  "software crisis"): modularity + the blast radius, coupling/cohesion + the interface seam
  (Dependency Inversion), the test pyramid, APIs + **semver**, a Conway's-Law callout; semver
  table, 4 pitfalls, 6 keyPoints, 4 sources. **compiler-pipeline HERO** (`sims/compiler/`): a pure,
  framework-free engine — `lexer.ts` (tokens + line/col positions) · `parser.ts` (recursive-descent
  AST + precise errors + `usesWhile`/`declaresVar`) · `compiler.ts` (codegen to a stack-VM with a
  slot symbol table, backpatched while/if jumps, semantic name errors) · `vm.ts` (a **stepped**
  stack VM, one bytecode op per step like ch.7's micro-steps, with divide-by-zero + step-limit
  guards) · `lang.ts` barrel (`compile`/`compileAndRun`, single precise error tagged by stage) ·
  `presets.ts` (5 presets + the P3 boss). The component shows **four live panes** (tokens → AST tree
  → bytecode → stepped stack VM) that update as you type; **boss mode** validates via `bossResult`
  → `markChallengeDone("boss-p3")`, badge *Language Smith*. **ch.10 sims** — `abstraction-elevator`
  (one program on 4 floors TS/C/asm/machine-code; the machine floor is the REAL output of ch.7's
  `assemble()` — a cross-chapter tie, hover-linked) and `call-stack-viz` (`call-stack/model.ts`:
  traced fib frames push/pop + a no-base-case overflow demo). **3 figs** — `paradigm-lens`
  (imperative/OOP/functional shapes), `jit-tiers` (Ignition→Sparkplug→TurboFan, optimize-on-
  assumptions→deopt), `test-pyramid`. **ch.12 sim** — `dependency-blast` (module graph; change a
  node → reverse-dependency blast radius; an interface seam stops the ripple). **3 quizzes**
  (trace-recursion, find-parse-error, blast-radius) + **14 interview Qs** (iv-ch10..12).
  **`scripts/test-p3.ts` (~100 checks: lexer tokens+positions, AST precedence/associativity/if-else,
  parse+semantic error stages, bytecode + jump targets, VM arithmetic/int-division/mod/comparisons/
  control-flow/divide-by-zero/infinite-loop, every preset's exact output, boss pass/fail, the
  call-stack trace, and the elevator↔ch.7 byte consistency)**, wired into `npm test`.
  registryKeys/registry → **23 sims, 12 figs**; new **P3 CSS block** in `global.css` (~714 lines,
  delegated to a subagent then reviewed). **Gotcha logged:** the P2 cache-sim already owns the
  `.cs-*` namespace (incl. bare `.cs` + `.cs-hint`); since the appended P3 block loads later it would
  have overridden and broken ch.8 — **resolved by renaming all call-stack-viz classes to `.stk-*`**
  in the component + the P3 CSS block only (cache-sim untouched). **Adversarial review** (subagent
  ran the engine independently with 67 hand-computed assertions + web-verified all 8 history/tech
  facts): **zero blocking, zero factual errors, all 9 quiz indices correct**. Two polish items
  actioned: (1) the `jit-tiers` figure drew a Sparkplug/baseline tier that was never highlighted →
  reworked to **6 frames** so baseline gets its own beat, plus a Maglev (V8 4th-tier, 2023) footnote;
  (2) tightened iv-ch10-3 to say V8 **implemented-then-removed** proper tail calls (not merely
  "declined"). **verify = typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓ (12 live chapters;
  23 sims · 12 figs · 12 quizzes · 58 interview Qs; mandate holds) · test ✓ (8 suites, +test-p3) ·
  build ✓** (fresh `dist-s6v2`: CompilerPipeline 24.4 KB/7.8 gzip · CallStackViz 5.3 · ParadigmLens
  6.2 · JitTiers 4.8 · react-vendor 190 KB). Sandbox notes: `dist-s6v*` gitignored (unlink block);
  the CSS temp was `mv`'d over global.css (rename allowed); review scratch scripts in `_test_ops/`.
  NOT sandbox-testable: real-browser pass — **5-min manual QA after deploy** (type in
  compiler-pipeline → tokens/AST/bytecode update live; Step runs the VM stack; break the syntax →
  the right stage error; boss mode: a variable + while loop printing 55 → *Language Smith*;
  call-stack-viz fib frames push/pop + overflow; abstraction-elevator hover-links all four floors;
  dependency-blast: change `db`, toggle the seam, radius shrinks; figures auto-play incl. jit-tiers'
  6 frames). **PART 3 COMPLETE — pending user commit. Next: S7 — P4 · Algorithms & Data Structures I:
  ch.13–14 (growth-racer HERO, hash-collision-lab) + kata runner v1.**
- **2026-07-05 · S7 (P4 · Algorithms & Data Structures I)** — ch.13–14 built to the golden bar +
  the **kata runner v1** (the learning engine's in-browser exercise system). **Kickoff decisions
  (user asked for the best-practice recommendation on both):** (1) **kata execution model = plain
  JS in a sandboxed, time-boxed Web Worker** (Blob-URL worker; `importScripts` overridden to throw;
  no DOM; hard 2 s timeout terminates infinite loops — §10), with the kata's **TS signature shown for
  teaching** and a **JS starter** run for real. Rationale: zero new deps, no multi-MB wasm transpiler
  (respects the tracked bundle budget), fully offline, and forward-compatible — each kata's
  prompt/tests/starter is authored once and the exec layer can swap to real-TS transpilation later
  (S18) without touching content. One source of truth for the assert helpers + case-eval semantics,
  shared between the worker (inlined) and Node (`runOneCaseSync`, used by `test-katas.ts`). (2) **v1
  batch = 10 katas focused on P4-so-far** (Big-O + linear structures), growing one part at a time (§6).
  **ch.13 Big-O & algorithmic thinking** (story: Bachmann coins *O* for *Ordnung*, 1894 → Landau's
  little-*o*, 1909 → Knuth reclaims it for CS + Ω/Θ + the “omicron” gag, 1976 — all web-verified):
  count work not seconds, drop constants + keep the dominant term, the growth ladder O(1)→O(n!),
  best/worst/average, **amortized** (Tarjan 1985, web-verified) via the doubling array; formal corner
  (O/Ω/Θ definitions + why O-where-you-mean-Θ misleads), doubling-vs-fixed-chunk compare, 4 pitfalls,
  7 keyPoints, 4 sources. **ch.14 Linear structures** (story: **Hans Peter Luhn's Jan 1953 IBM memo**
  — hashing-with-chaining *and* among the earliest linked-list references, web-verified): arrays
  (contiguous, O(1) index, cache-friendly), linked lists (O(1) splice / O(n) find / cache-miss
  pointer-chase), stacks/queues (LIFO/FIFO, O(1) ends), hash tables (hash→bucket, collisions,
  chaining vs open addressing, load factor, resize/rehash); formal corner (expected chain length α,
  open-addressing probes ≈ 1/(1−α)), array-vs-list compare, a senior callout on the good hash as a
  **security boundary** (hash-flooding → SipHash, ch.32), 4 pitfalls, 7 keyPoints, 4 sources.
  **1 HERO + 4 micro sims** — `growth-racer` (instruments **real** TS snippets with op-counters:
  run(n)===formula(n) for O(1)…O(n!), guarded so 2ⁿ/n! never hang; log-scale toggle; curves race as
  n advances), `amortized-doubling` (per-op spikes at each doubling, running average flattens;
  totalCost(1000)=2023 < 3N), `array-vs-list-memory` (**reuses ch.8's `runCache` engine** — array
  hitRate 1−1/lineSize vs list ~0.19, pointer-chase thrash visible on the RAM grid), `hash-collision-lab`
  (bad vs good hash — **FNV-1a**, verified against 0xE40C292C — × chaining vs linear probing, load-factor
  slider, rehash), `stack-queue-stepper` (LIFO vs FIFO on one stream). **2 figs** — `complexity-ladder`
  (the ranked ladder with concrete costs at n=1,000) + `hash-anatomy` (one lookup stepped: key→hash→
  mod→bucket→chain/probe; the “cat”/“bee” collision is genuinely real). **2 quizzes** (`match-the-O`
  6 Qs, `where-it-lands` 4 Qs) + **10 interview Qs** (iv-ch13/14, mid→staff). **Kata runner:**
  `lib/kataSandbox.ts` + `data/katas.ts` (10 katas: binary-search, dynamic-array, dedup-sorted [ch13];
  stack-impl, queue-ring, is-balanced, hashmap-chaining, two-sum, reverse-list, lru-cache [ch14]) +
  `study/KataRunner.tsx` + `pages/KatasPage.tsx` (new `#/katas` route + top-nav entry; editor persisted +
  solved-set in localStorage). **New engines** — `growth-racer/growth.ts`, `amortized-doubling/model.ts`,
  `array-vs-list-memory/model.ts` (reuses `fast-cpu/cache.ts`), `hash-collision-lab/model.ts`,
  `stack-queue-stepper/model.ts` — plus **`scripts/test-ch13.ts` (97 checks), `test-ch14.ts`, and
  `test-katas.ts` (every reference solution passes; every starter fails ≥1 test — 67 cases / 10 katas)**,
  all wired into `npm test`. registryKeys/registry → **28 sims, 14 figs**; the **qa gate now enforces
  kata referential integrity** (unique ids, chapter match, exportName+tests present). New **P4 CSS block**
  in `global.css` (~940 lines, semantic palette, focus ring on the kata editor, reduced-motion inherited)
  — delegated to a subagent then reviewed. **Adversarial review** (subagent ran every engine
  independently with hand-computed values + web-verified all history/technical facts + recomputed every
  quiz index + stress-tested katas with wrong implementations): **zero blocking, zero factual errors,
  every quiz answer correct, all figure numbers correct**. Three items actioned: (1) **weak test** — the
  `lru-cache` kata's suite could be fooled by a `put` that updates value but not recency (an intervening
  `get` masked it); added a discriminating test (update-then-evict, no read between) → now 67 cases; (2)
  **prose precision** — an interview answer's “1+2+…+n/2 < n” geometric-sum bound is only exact for
  powers of two (n=1000→1023 copies), softened to “≈ n (< 2n)”; (3) **figure nit** — the O(n!) rung
  showed 1000!'s digit-count as an exponent (10²⁵⁶⁸), corrected to the magnitude 10²⁵⁶⁷ + “2,568-digit
  number”. Also added ch32 to ch.14's seeAlso (the hash-flooding paragraph references it). **verify =
  typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓ (14 live chapters; 28 sims · 14 figs · 14 quizzes ·
  68 interview Qs · 10 katas; mandate holds) · test ✓ (11 suites: +test-ch13 97, +test-ch14, +test-katas
  67) · build ✓** (fresh `dist-s7v`: GrowthRacer 9.1 KB · HashCollisionLab 7.8 · ArrayVsListMemory 6.8 ·
  HashAnatomy 5.9 · StackQueueStepper 5.8 · AmortizedDoubling 5.2 · ComplexityLadder 4.8 · react-vendor
  190 KB; `dist-s7*` gitignored, removed cleanly). **INTERACTIVES.md** updated inventory-first (added the
  two figs + a Katas v1 section; census → 36 figs + kata runner). Note for a future polish pass (S18/S19):
  the kata data + KatasPage sit in the main index bundle (like the other pages/data modules); if initial
  load matters, lazy-load the `#/katas` route. NOT sandbox-testable: real-browser interaction pass —
  **5-min manual QA after deploy** (growth-racer curves race + log toggle + real op-counts; amortized
  spikes flatten; array-vs-list cache hits vs misses on the grid; hash-collision-lab bad↔good hash and
  chaining↔probing + rehash; stack-queue LIFO/FIFO; `#/katas`: edit a starter, Run in the worker, watch
  per-test pass/fail, timeout on an infinite loop, solved ✓ persists; complexity-ladder + hash-anatomy
  auto-play). **S7 CLOSED pending user commit. Next: S8 — P4 · A&DS II: ch.15 (Trees & heaps — bst-builder,
  heap-ops, trie-autocomplete) + ch.16 (Sorting & searching — sorting-race HERO) + grow the kata batch.**
- **2026-07-07 · S8 (P4 · Algorithms & Data Structures II)** — ch.15–16 built to the golden
  bar; Part 4 now has structures (trees/heaps/tries) *and* the algorithms that order and
  search them. **Kickoff decisions (user asked for the best-practice recommendation on the
  first, chose the other two):** (1) **balancing = AVL mode inside `bst-builder`** (the
  recommended path — makes rebalancing *touchable* per the §6 mandate; red-black stays a
  Senior callout + `rb-intuition` fig + an AVL/RB compare). (2) **all seven sorts in one
  race** (user pick) — granted *honestly* by racing on a **fair unified metric: array
  accesses (reads + writes)**, with comparisons as a second column so counting/radix's hard
  **zero** becomes the teaching payoff rather than an apples-to-oranges (racing all seven on
  "comparisons" would have been dishonest since two make none). (3) **+10 katas** (user pick).
  **ch.15 Trees & heaps** (story: **Adelson-Velsky & Landis, 1962** — the first self-balancing
  BST; heap = **Williams 1964**, trie = **Fredkin 1960**, all web-verified): the BST invariant
  + O(height); the degenerate-stick failure on sorted input; **AVL** rotations (LL/RR/LR/RL,
  |bf| ≤ 1, height ≤ ~1.44 log₂n) with a **Fibonacci-recurrence formal corner**; a red-black
  Senior callout (looser balance → fewer writes; std::map/TreeMap/Linux scheduler); **heaps**
  as a complete tree packed into an array (parent ⌊(i−1)/2⌋, children 2i+1/2i+2) with a
  **Floyd O(n) build-heap formal corner** (Σ h/2ʰ = 2); **tries** (O(L), prefix sharing,
  autocomplete = collect-the-subtree); a structure-selection table; B-tree teaser → ch.29.
  4 pitfalls, 8 keyPoints, 4 sources. **ch.16 Sorting & searching** (story: **Hoare's
  quicksort, 1959 Moscow State** — sort words before a magnetic-tape dictionary lookup;
  publ. **CACM 1961, Algorithm 64**, web-verified): binary search + **lower-bound**, the
  **`(lo+hi)/2` overflow** Senior callout (**Bloch, 2006**, web-verified); the five comparison
  sorts; the **`sorting-race` HERO**; reading the race (data-dependence, quicksort's n² on
  sorted, selection's minimal writes); **stability** (+ `sort-stability` fig — the one thing
  the number-only race can't show); a 7-sort complexity table; the **Ω(n log n)
  decision-tree formal corner** (n! leaves, log₂(n!) ≈ n log n); counting/radix as the escape;
  a **Timsort/introsort** Senior callout (web-verified); → ch.17. 4 pitfalls, 8 keyPoints,
  5 sources. **1 HERO + 4 micro sims** — `sorting-race` (seven instrumented sorts on a shared
  access clock, data-shape presets, per-lane bars + ranking), `bst-builder` (immutable BST/AVL
  engine with a step trace; AVL rotations animate; traversal readout), `heap-operations`
  (min-heap shown in the array **and** the complete-tree at once; push/pop/heapify), `trie-
  autocomplete` (type to walk/insert; suggestions from the subtree), `binary-search`
  (window-halving stepper, exact + lower-bound). **4 figs** — `tree-rotation`, `rb-intuition`,
  `merge-recursion`, `sort-stability`. **2 quizzes** (`tree-predict`, `sort-predict`) + **10
  interview Qs** (iv-ch15/16, mid→staff). **+10 katas** — bst-insert, validate-bst,
  bst-level-order, min-heap, heapify, trie-autocomplete [ch15]; binary-search-lower-bound,
  merge-two-sorted, quickselect, counting-sort [ch16] — kata batch now **20** (106 test cases).
  **5 pure engines** (`bst-builder`, `heap-operations`, `trie-autocomplete`, `sorting-race`,
  `binary-search` `/model.ts`) + **`scripts/test-ch15.ts`** (BST/AVL invariants incl. the four
  rotation cases and sorted-1..15 → height 4, heap validity/drain/Floyd, trie prefix-sharing)
  and **`scripts/test-ch16.ts`** (all 7 sorts correct on random/sorted/reversed/few-unique ×
  n∈{0,1,2,17,40}; counting/radix = 0 comparisons; selection/insertion/quick comparison
  signatures; binary-search + lower-bound edges) — both wired into `npm test`; `test-katas`
  chapterId set extended to ch15/ch16. **Bug caught by the fail-fast engine tests BEFORE any
  UI:** insertion sort compared `a[j]` against `a[j+1]`, but the shift overwrites `a[j+1]` —
  it must compare against the *saved key value*; added `cmpVal` and fixed (test-ch16 went red
  first, as intended). registryKeys/registry → **33 sims, 18 figs**; new **P4·S8 CSS block**
  (~800 lines, delegated to a subagent then reviewed — no `.bst/heap/trie/sort/bsearch-`
  namespace collisions, braces balanced). One lint cleanup: `trie-autocomplete` used a
  mutable-ref-plus-`version` pattern that tripped `react-hooks/exhaustive-deps` → switched to
  a `useReducer` force-update + direct (un-memoized) compute; 0 warnings restored.
  **Adversarial review** (subagent: independent `/tmp` probes on all five engines with
  adversarial inputs + web-verified every dated fact + recomputed all six quiz indices +
  hand-checked the four figures and ten kata solutions): **zero blocking, zero factual errors,
  zero wrong quiz answers, every engine invariant holds** (200-key AVL stays valid+balanced;
  counting/radix genuinely stable and zero-comparison; lower-bound is the exact insertion
  point). **verify = typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓ (16 live chapters;
  33 sims · 18 figs · 16 quizzes · 78 interview Qs · 20 katas; mandate holds) · test ✓ (13
  suites; +test-ch15, +test-ch16, +10 katas → 106 kata cases) · build ✓** (fresh `dist-s8`:
  SortingRace 10.9 KB · BstBuilder 10.4 · HeapOperations 8.6 · TrieAutocomplete 6.8 ·
  BinarySearch 6.1 · the 4 figs 6.4–6.9 · react-vendor 190 KB · index 405 KB/148 gzip — the
  data modules still sit in the main index bundle, so the S18/S19 lazy-load-the-data note
  stands). `dist-s8` gitignored (`dist-*`); sandbox `unlink` still blocked (harmless).
  **INTERACTIVES.md** updated (ch.15/16 sections rewritten to shipped keys + the 10 katas +
  census). NOT sandbox-testable: real-browser interaction pass — **5-min manual QA after
  deploy** (bst-builder: insert 1..5 in BST mode → stick, flip to AVL → it rotates level, watch
  balance factors + LL/RR/LR/RL captions, delete + traversals; heap-operations: push/pop/heapify
  highlight the same index in both the array and the tree; trie: type a prefix → path lights +
  suggestions, Insert flags new nodes; sorting-race: set few-unique → counting/radix pull ahead
  with a 0 in the compares column, set sorted → quicksort blows up, step the access clock;
  binary-search: window halves, lower-bound lands on the first duplicate; figures auto-play).
  **S8 CLOSED pending user commit. Next: S9 — P4 · A&DS III: ch.17 (Graphs — `pathfinder`
  HERO, repr-switcher, topo-stepper) + ch.18 (Design paradigms — dp-table-filler,
  n-queens) + P4 boss (Pathmaster).**
- **2026-07-07 · S9 (P4 · Algorithms & Data Structures III)** — ch.17–18 built to the golden
  bar; **Part 4 is complete** (cost → structures → sorting/searching → graphs → paradigms),
  and the **P4 boss `Pathmaster` went live** inside the pathfinder. **Kickoff (3 AskUserQuestion):**
  user chose (1) **whole S9 in one pass**, (2) **full INTERACTIVES.md inventory** (not the
  mandate-core subset), (3) **branch + commit** (`feat/s9-p4-ads-iii-graphs-design`). **ch.17
  Graphs** (story: **Euler's 1736 Königsberg bridges** — the first theorem of graph theory;
  Senior story callout: **Dijkstra's 1956** 20-minute café conception on the **ARMAC**,
  Rotterdam→Groningen, publ. **1959 Numerische Mathematik**, all web-verified): representations
  (matrix O(1) edge-test/V² space vs list V+E/O(deg)); the **one-loop-different-container**
  insight (queue=BFS, stack=DFS) with a unified TS snippet; **Dijkstra** (priority queue by cost)
  and **A\*** (**Hart/Nilsson/Raphael 1968**, Shakey/SRI, web-verified) with the **heuristic-weight
  dial** (0=Dijkstra, 1=admissible, ≫1=greedy); a 4-search table; **Kahn topological sort**
  (**1962 CACM**) + cycle detection; **MST** (**Borůvka 1926**, Kruskal/Prim) with `mst-grow`;
  Senior callout (heap complexity, contraction hierarchies, Bellman–Ford) + a **negative-edge
  formal corner**. 4 pitfalls, 7 keyPoints, 4 sources. **ch.18 Design paradigms** (story:
  **Bellman naming "dynamic programming"** at RAND to dodge Wilson's hatred of "research" — with
  the **Russell–Norvig caveat** that the tale can't be strictly true; web-verified): D&C→DP via
  overlapping subproblems; memo vs tabulation (+ Fibonacci snippet); **"DP is shortest-path on a
  DAG"** Senior callout; **greedy** + the greedy-choice/matroid caveat; **backtracking** +
  N-queens (**Bezzel 1848 / Nauck 1850 / 92 solutions**, web-verified); a 4-paradigm table; a
  decision guide; Senior callout (rolling-array, branch & bound) + an **optimal-substructure vs
  greedy-choice formal corner**. 4 pitfalls, 7 keyPoints, 4 sources. **1 HERO + 5 micro sims** —
  `pathfinder` (framework-free BFS/DFS/Dijkstra/A\* engine → deterministic expansion+frontier
  trace; paintable walls & heavy terrain; A\* heuristic slider; **boss mode** loads the revealed
  maze + visited-node budget → `markChallengeDone("boss-p4")` = *Pathmaster*), `repr-switcher`,
  `topo-stepper`, `dp-table-filler` (exploding-recursion motif next to the memo table filling
  cell-by-cell), `nqueens-backtracker` (place/reject/backtrack trace with board snapshots per
  event; first/all toggle), `greedy-fails` (greedy vs DP-optimal + counterexample hunter). **1
  fig** `mst-grow` (Kruskal vs Prim side-by-side, same tree weight 10). **2 quizzes**
  (`graph-predict`, `pick-the-paradigm`) + **11 interview Qs** (iv-ch17 ×6, iv-ch18 ×5, mid→staff)
  + **4 katas** (`bfs-shortest-path`, `topo-order` [ch17]; `lcs-length`, `coin-change-min` [ch18])
  → batch now **24** (125 cases); `test-katas` chapterId set extended to ch17/ch18. **6 pure
  engines** (`pathfinder/repr-switcher/topo-stepper/dp-table-filler/nqueens-backtracker/greedy-fails
  /model.ts`) + **`scripts/test-ch17.ts`** (BFS hop-optimal; Dijkstra == A\*(1) cost; A\*(1) expands
  ≤ Dijkstra; hw=0 ≡ Dijkstra order; DFS ≥ BFS + an adversarial maze where DFS is strictly longer;
  walls block; the boss maze is a real challenge — BFS blows the budget, A\*(1) beats it; matrix/list
  costs; Kahn order + cycle) and **`scripts/test-ch18.ts`** (LCS lengths + recursion≫cells; N-queens
  counts **1,0,0,2,10,4,40,92** + validity + pruning; greedy canonical vs {1,3,4}@6) — both wired
  into `npm test`. **Fail-first caught 3 issues BEFORE any UI:** a wrong edge-count expectation
  (demoGraph is 7 edges, not 6), and a grid-dependent DFS-vs-BFS claim that only holds on a crafted
  maze (relaxed to the true ≥ invariant + a purpose-built trap) — engines were correct; tests were.
  Strict-TS gotcha fixed early: `Record<number,number>` index vs `undefined` (TS2367) → the pathfinder
  engine uses `Map`s internally, converts at the boundary. registryKeys/registry → **39 sims, 19
  figs**; new **P4·S9 CSS block** in `global.css` (~330 lines: pathfinder grid/legend, repr matrix+
  lists, topo graph, dp tree+table, nqueens board, greedy cards; reduced-motion-gated transition).
  **verify = typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓ (18 live chapters; 39 sims · 19 figs ·
  18 quizzes · 89 interview Qs · 24 katas · 10 bosses; mandate holds) · test ✓ (15 suites; +test-ch17,
  +test-ch18, +4 katas → 125 kata cases) · build ✓** (fresh `dist-s9`: Pathfinder 9.5 KB · SortingRace
  10.9 · react-vendor 190 KB · index 458 KB/167 gzip — data modules still in the main bundle, S18/S19
  lazy-load note stands). `dist-s9` gitignored (`dist-*`); the pre-existing `dist/` is un-`unlink`able
  on the sandbox mount (`EPERM`, harmless — real `npm run build` clears it via the usual `rm -rf dist`).
  **INTERACTIVES.md** updated (ch.17/18 → shipped keys + `graph-predict` + the 4 katas). NOT
  sandbox-testable: real-browser interaction pass — **5-min manual QA after deploy** (pathfinder: paint
  walls + heavy terrain, run all four algorithms, drive the A\* slider 0→3 and watch visited-count vs
  path-cost, enter boss → beat the budget with A\*(1) → Pathmaster badge lights; repr-switcher: toggle
  op/u/v and read the matrix-vs-list counters; topo-stepper: step the peel, flip "add cycle" → stuck;
  dp-table-filler: watch the table fill + the LCS backtrace, edit the strings; nqueens: N=6 first→all,
  tries counter; greedy-fails: preset {1,3,4} + "jump to failure"; mst-grow auto-plays). **S9 CLOSED
  pending user commit. Next: S10 — P5 · Theory: ch.19 (Automata — fsm-builder) + ch.20 (Computability —
  turing-machine HERO) + ch.21 (Complexity — P vs NP) + P5 boss (Halting Oracle).**
- **2026-07-07 · S10 (P5 · Theory — PART 5 COMPLETE)** — ch.19–21 built to the golden bar; the
  guide now carries the whole arc automata → computability → complexity, and the **P5 boss
  `Halting Oracle` went live** inside the turing-machine HERO. **Kickoff (4 AskUserQuestion):**
  user chose (1) **whole S10 in one pass**, (2) **full INTERACTIVES.md inventory**, (3) asked for
  the recommended **TM convention** → Sipser accept/reject decider (single tape; (state,read)→
  (write,move L/R,next); explicit `accept`/`reject` halt states; busy beavers just halt into
  `accept`) — one engine serves deciders, transducers, and busy beavers, and the aⁿbⁿ boss is a
  clean "halts-in-accept?" check; (4) **stage-only** hand-off (user commits on the Mac). **ch.19
  Automata** (story: McCulloch–Pitts 1943 → Kleene's regex/finite-automata 1951/1956 → Chomsky
  1956 → Rabin–Scott NFA 1959, all web-verified): DFA/NFA, ε-moves, Kleene's theorem, Thompson +
  subset construction (NFA≡DFA, the 2ⁿ blow-up + ReDoS senior beat), the Chomsky hierarchy, and
  the pumping-lemma wall (aⁿbⁿ not regular) — 6 keyPoints, 4 pitfalls, 5 sources. **ch.20
  Computability** (story: Hilbert's Entscheidungsproblem → Turing 1936): TM model, universality +
  Church–Turing (tie back to ch.7's stored program), decidable vs recognizable, the **halting
  problem** by diagonalization, **Rice's theorem** + the static-analysis consequences, and the
  **busy beaver** (Σ(3)=6/14 steps, Σ(4)=13/107 steps, S(3)=21, **S(5)=47,176,870 proved 2024** —
  web-verified, Coq-checked) — 6 keyPoints, 4 pitfalls, 6 sources. **ch.21 Complexity** (story:
  Cook 1971 SAT → Karp 1972's 21 → Clay **$1,000,000** 2000): P (Cobham–Edmonds), NP = poly-
  *verifiable* (not "non-polynomial"), NP-completeness & reductions, P vs NP, and coping
  (approximation with a *proven* ratio like Christofides 1.5× vs heuristics like 2-opt) — 6
  keyPoints, 4 pitfalls, 6 sources. **5 sims + 3 figs + 3 quizzes + 1 boss** — `fsm-builder`
  (editable DFA + div-by-3 challenge graded against the true language), `regex-nfa` (Thompson
  ε-NFA, live parallel-path walk, equivalent-DFA state count), **`turing-machine` HERO** (scrolling
  tape + editable rule table; step/run/timeout; presets unary-add/palindrome/BB3/BB4 with step-
  count fireworks; **boss mode grades an aⁿbⁿ decider → `markChallengeDone("boss-p5")` = *Halting
  Oracle***), `brute-force-death-watch` (n × growth × rate → honest wall-clock, log-scale bars),
  `tsp-playground` (NN vs 2-opt vs brute-force optimal, tour-count lock past n=9); figs
  `chomsky-rings`, `halting-paradox` (6-frame diagonalization comic), `pnp-map` (P/NP/NPC/NP-hard +
  P=NP two-worlds); quizzes `regular-or-not` / `does-it-halt` / `np-or-not`; **+6 katas**
  (dfa-accepts, binary-divisible-by-three [ch19]; anbn-decide, collatz-steps [ch20];
  subset-sum-decide, verify-hamiltonian [ch21]) → batch now **30** (149 cases). **3 pure engines**
  (`automata/model.ts`, `turing/model.ts`, `complexity/model.ts`) + **`scripts/test-ch19.ts`**
  (div-by-3 correct vs value%3 to len 12; regex→NFA→subsetDFA agree on all |s|≤6 for 4 regexes;
  a+/a?/a* semantics), **`test-ch20.ts`** (unary-add sums; palindrome decides; **BB(3)=14 steps/6
  ones, BB(4)=107/13** exactly; accept/reject/timeout trichotomy; REFERENCE_ANBN passes the boss
  suite, starter fails), **`test-ch21.ts`** (2ⁿ/n!/tour counts; time math; 2-opt never lengthens;
  optimal ≤ 2-opt ≤ NN) — all wired into `npm test` + `verify`. **Sim components + figures were
  delegated to parallel subagents then reviewed** (each built only its own file against the
  tested engines; per-component styles live in `src/theme/_p5css/*.css`, imported as side-effects —
  a light modularization; figures use inline SVG styling as before). **Adversarial review**
  (subagent: independent Node probes on all three engines + web-verified every dated fact +
  recomputed all 9 quiz keys + ran the katas): all facts correct (incl. the tricky **Σ(3)=6 /
  S(3)=21** distinction), all quiz keys correct, all engine invariants hold — and it caught **one
  BLOCKING bug the sandbox's truncated test output had hidden**: `twoOpt` non-terminated on the
  demoCities instance because the i=0/k=n-1 case reverses the *entire* tour (a direction flip the
  edge-delta scores as an eternal improvement), hanging both `test-ch21` and the tsp sim on mount —
  fixed by skipping that degenerate whole-tour reversal (locked by the now-completing test). Three
  polish items also actioned: 2-opt reclassified from "approximation with a ratio" to a heuristic
  (only Christofides carries the proven 1.5×) in both the coping prose and the pitfall; a kata
  label and a stale test comment corrected. **verify = typecheck ✓ · lint ✓ (0/0) · qa ✓ (21 live
  chapters; 44 sims · 22 figs · 21 quizzes · 106 interview Qs · 30 katas · 10 bosses; mandate
  holds) · test ✓ (18 suites; +test-ch19/20/21, +6 katas → 149 cases) · build ✓** (fresh
  `dist-s10b`: TuringMachine 18.0 KB · HaltingParadox 14.4 · FsmBuilder 12.5 · SortingRace 10.9 ·
  PnpMap 10.7 · RegexNfa 9.8 · TspPlayground 7.3 · BruteForceDeathWatch 6.9 · react-vendor 190 KB ·
  index 522 KB/190 gzip — data modules still in the main bundle, S18/S19 lazy-load note stands).
  `dist-s10*` gitignored (`dist-*`); sandbox `unlink` still blocked (harmless). **INTERACTIVES.md**
  updated (ch.19–21 → shipped keys + the 3 quizzes + 6 katas + census → Part 5 complete). NOT
  sandbox-testable: real-browser interaction pass — **5-min manual QA after deploy** (fsm-builder:
  build the div-by-3 DFA, feed strings, run the challenge check; regex-nfa: type `(a|b)*abb`, step
  a string, watch the live-set + DFA-state count; turing-machine: run each preset, watch BB3 halt
  at 14 steps, then boss → build aⁿbⁿ → suite passes → *Halting Oracle* badge; brute-force-death-
  watch: drag n, flip problem/rate, see the years/universe readout; tsp-playground: drag cities,
  NN→2-opt→optimal, brute force locks past n=9; chomsky-rings / halting-paradox / pnp-map auto-play).
  **S10 CLOSED pending user commit — suggested branch `feat/s10-p5-theory`. PART 5 COMPLETE. Next:
  S11 — P6 · Operating Systems I: ch.22 (Processes & scheduling — scheduler-sim HERO) + ch.23
  (Memory — paging/address-translation steppers).**
- **2026-07-07 · S11 (P6 · Operating Systems I)** — ch.22–23 built to the golden bar; the guide
  now carries the OS's two great illusions, time-sharing and virtual memory. **Kickoff (4
  AskUserQuestion):** user chose (1) **whole S11 in one pass**; (2) the **canonical scheduler set**
  — FCFS, SJF, SRTF, RR, preemptive Priority + **aging/starvation**, plus **MLFQ** as a senior
  stretch; (3) **deep paging** — TLB + a single/2-level walk toggle, and FIFO/LRU/**Optimal**/**Clock**
  with **Bélády's anomaly** + thrashing; (4) **stage-only** hand-off (user commits on the Mac). The
  **P6 boss stays in S12** (`deadlock-lab`, ch.25). **ch.22 Processes & scheduling** (story: **Corbató
  / CTSS**, MIT, 1961, IBM 709 — web-verified): program vs process, the PCB + the new→ready→running→
  blocked→terminated state machine, process vs thread, **user/kernel mode + the system-call trap**,
  the context switch (direct ~µs vs the larger indirect cache/TLB cost), the five scheduling criteria,
  the FCFS/SJF/SRTF/RR/priority/MLFQ family + a senior **O(1)→CFS→EEVDF** beat (**EEVDF default since
  Linux 6.6, Oct 2023** — web-verified) and a formal SJF-optimality proof — 7 keyPoints, 4 pitfalls, 6
  sources. **ch.23 Memory** (story: **Kilburn / Atlas** "one-level store", Manchester, Dec 1962 — web-
  verified): virtual memory & the address space, paging (page/frame/page-table, the offset-passes-through
  bit split), the **TLB**, the **page fault** (vs segfault) + replacement, thrashing & **Denning's working
  set (1968)**, and a senior **x86-64 4-/5-level, 4 KiB/2 MiB/1 GiB huge-pages** beat — 7 keyPoints, 4
  pitfalls, 7 sources. **1 HERO + 3 micro + 2 fig + 2 quiz** — **`scheduler-sim` HERO** (editable process
  table; FCFS/SJF/SRTF/RR/priority/MLFQ; Gantt revealed by the transport; per-process wait/turnaround/
  response + averages/util; context-switch-cost slider; Convoy/Mixed/RR presets), `syscall-boundary`
  (7-step user↔kernel trap, mode bit + one vetted entry point), `address-translate` (bit-split → single/
  2-level walk → persistent TLB → physical, or page-fault trap), `page-fault-lab` (FIFO/LRU/Optimal/Clock
  with ref-bits+hand; fault-vs-frames curve; Bélády callout; Silberschatz/Bélády presets); figs
  `process-states` (8-frame lifecycle walk) + `stack-vs-heap` (7-frame address space, leak → OOM); quizzes
  `scheduling-predict` / `paging-predict`; **+4 katas** (sjf-average-wait, round-robin-order [ch22];
  page-table-translate, fifo-page-faults [ch23]) → batch now **34**. **2 pure engines** (`scheduler-sim/
  model.ts` — a unit-time scheduler + a separate context-switch-overlay pass, so CS=0 reproduces the
  textbook exactly; `paging/model.ts` — address translation + FIFO/LRU/Optimal/Clock + working-set/curve
  helpers) + **`scripts/test-ch22.ts`** (FCFS/SJF/SRTF/RR/priority Gantt + avg wait/turnaround vs the
  canonical **Silberschatz** instances; RR arrival-vs-preemption tie-break; CS accounting; aging rescues a
  starved job 16→14; MLFQ favours short jobs; per-algorithm invariants) and **`scripts/test-ch23.ts`**
  (VA→PA arithmetic single/2-level; TLB LRU; **Silberschatz FIFO 15 / LRU 12 / OPT 9**; **Bélády 3f=9,
  4f=10**; Optimal-minimality; working set) — wired into `npm test` + `verify`; test-katas whitelist
  extended to ch22–23. **Sim components + figures were delegated to parallel subagents then reviewed**
  (each built only its own file against the tested engines; per-sim styles in `src/theme/_p6css/*.css`
  imported as side-effects; figures inline-styled). **Adversarial review** (subagent: independent Node
  probes + a from-scratch exhaustive Optimal/SJF minimizer confirming the engines are *externally*
  correct, not just self-consistent; recomputed all 6 quiz keys; hand-traced the katas; web-re-verified
  every dated fact incl. EEVDF-still-default-2026, Atlas Dec 1962, Bélády 1969, Denning 1968, x86-64 page
  sizes): **no blocking issues** — one polish item actioned (the CTSS hook said "Spring 1961 …
  demonstrates"; the public demo was **November 1961**, spring was project start — softened to "1961 …
  that November"). **verify = typecheck ✓ · lint ✓ (0/0) · qa ✓ (23 live chapters; 48 sims · 24 figs ·
  23 quizzes · 118 interview Qs · 34 katas · 10 bosses; mandate holds) · test ✓ (18 suites; +test-ch22/23,
  +4 katas) · build ✓** (fresh `dist-s11`: SchedulerSim 15.9 KB · TuringMachine 18.0 · CompilerPipeline
  24.4 · PageFaultLab 8.7 · AddressTranslate 8.4 · StackVsHeap 7.8 · SyscallBoundary 7.1 · react-vendor
  190 KB · index 573 KB/208 gzip — data still in the main bundle, S18/S19 lazy-load note stands).
  `dist-s11` gitignored (`dist-*`); sandbox `unlink` still blocked (build uses a fresh `--outDir`).
  **INTERACTIVES.md** updated (ch.22–23 → shipped keys + 2 quizzes + 4 katas + census → P6 OS I done).
  NOT sandbox-testable: real-browser interaction pass — **5-min manual QA after deploy** (scheduler-sim:
  load Convoy, flip FCFS→SJF and watch avg-wait 14→2, turn on CS cost + shrink quantum to see utilization
  drop, try MLFQ; syscall-boundary: step the 7 stages, watch the mode bit flip at the trap; address-
  translate: translate a present VA then repeat for a TLB hit, then a fault VA, toggle 1↔2 levels;
  page-fault-lab: Bélády preset under FIFO at 3 vs 4 frames → anomaly callout, switch to LRU/Optimal;
  process-states / stack-vs-heap: step + auto-play). **S11 CLOSED pending user commit — suggested branch
  `feat/s11-p6-os-i`. Next: S12 — P6 · OS II: ch.24 (Files & storage) + ch.25 (Concurrency — deadlock-lab
  HERO) + the P6 *Deadlock Breaker* boss.**
- **2026-07-07 · S12 (P6 · OS II — PART 6 COMPLETE)** *(log entry backfilled at S13 — the S12
  session shipped but did not record its own status paragraph)*. Per the merge commit and repo state:
  ch.24 **Files & storage** (`inode-explorer` HERO + `disk-allocation` micro + `journaling` fig) and
  ch.25 **Concurrency** (`deadlock-lab` HERO + `race-lab` micro + `wait-for-graph` fig) built to the
  golden bar; the **P6 *Deadlock Breaker* boss** went live inside `deadlock-lab`. Engines
  `sims/files/model.ts` + `sims/concurrency/model.ts` with `scripts/test-ch24/25.ts`; +4 katas
  (batch → 38), 12 interview Qs, 2 quizzes. Footer redesign merged separately (PR #13). **Part 6
  complete.** *(If any S12 detail is needed, see commit `06a831e`.)*
- **2026-07-08 · S13 (P7 · Networks — PART 7 COMPLETE)** — ch.26–28 built to the golden bar; the guide
  now leaves the single machine and crosses the planet: **name → packet → reliable stream → encrypted
  request → page**, and the **P7 *Wire Shark* boss went live** inside `tcp-lab`. **Kickoff (4
  AskUserQuestion):** user chose (1) **whole P7 in one pass**; (2) the recommended **TCP Reno** spine for
  the congestion engine (slow-start → AIMD → fast recovery = the classic sawtooth, with a senior
  **CUBIC (Linux default) / BBR** beat); (3) **full INTERACTIVES.md inventory**; (4) **stage-only**
  hand-off. **ch.26 How networks work** (story: **ARPANET's first message, 29 Oct 1969** — Charley Kline
  types LOGIN, it crashes after "LO"; web-verified): the four-layer TCP/IP model as **encapsulation**,
  the **link layer** (MAC + a learning switch: flood → learn → forward), the **internet layer** (IP,
  routers, **TTL** decrement + the traceroute trick), and **DNS** (**Mockapetris 1983**, root→TLD→
  authoritative); a NAT/IPv6/ARP/**BGP (~78,000 ASes)** senior callout + a **hierarchical-addressing**
  formal corner (longest-prefix match: O(prefixes), not O(hosts)). 7 keyPoints, 4 pitfalls, 5 sources.
  **ch.27 TCP & UDP** (story: **Cerf & Kahn, May 1974** + the end-to-end principle; **flag day 1 Jan
  1983**; web-verified): TCP vs UDP, the **3-way handshake** (a SYN consumes a sequence number → ack =
  peer + 1), reliability (cumulative ACKs + sliding window + timeout/fast-retransmit), **flow vs
  congestion control** (rwnd vs cwnd), and **TCP Reno** — the **1986 collapse** (~800×, 32 Kbps→40 bps),
  **Tahoe 1988 → Reno's fast recovery**, the AIMD sawtooth; senior **CUBIC/BBR/head-of-line** beat +
  a **window/RTT throughput + AIMD-fairness (Chiu-Jain 1989)** formal corner. Hosts the **boss**. 7
  keyPoints, 4 pitfalls, 5 sources. **ch.28 The Web** (story: **Berners-Lee, March 1989 CERN**, "vague
  but exciting"; web-verified): HTTP request/response + statelessness, the **URL→pixels** timeline,
  **HTTPS/TLS 1.3** (RFC 8446, **1-RTT / 0-RTT** resumption), **HTTP/1.1→2→3** head-of-line blocking
  (app-layer → TCP-layer → QUIC fixes it; **HTTP/3 = RFC 9114, 2022, ~21% & plateaued**), and **caching**
  (max-age/ETag/no-store/CDN); a CDN/cookies/CORS/**0-RTT-replay** senior callout + a **cache-freshness**
  formal corner. Closes Part 7. 7 keyPoints, 4 pitfalls, 5 sources. **1 HERO + 5 micro + 2 fig + 3 quiz
  + 1 boss** — `packet-journey` HERO (DNS side-quest → hop-by-hop journey, TTL ticks, MAC rewritten/IP
  pinned, encapsulation envelope, low-TTL drop preset), `switch-learning`, **`tcp-lab` HERO** (lab|boss:
  handshake stepper + Go-Back-N loss/retransmit + Reno **cwnd sawtooth** with injectable triple-dup/
  timeout; **boss grades 3 broken handshakes → `markChallengeDone("boss-p7")` = 🦈 *Wire Shark***),
  `udp-vs-tcp-race`, `url-journey`, `cache-headers`; figs `layer-cake` + `http-evolution`; quizzes
  `packet-predict` / `seq-puzzle` / `web-predict`. **4 pure engines** — `sims/net/{layers,switching,tcp,
  web}.ts` — plus **`scripts/test-ch26.ts`** (encapsulation round-trip, journey IP-constant/MAC-rewritten/
  TTL, DNS, switch learning), **`test-ch27.ts`** (handshake seq/ack + each broken-field diagnosis, all 3
  boss traces distinct + graded, Go-Back-N recovers under loss, **Reno sawtooth: 1→2→4→8→16 then 17;
  triple-dup→8; timeout→1**), **`test-ch28.ts`** (timeline sum, HOL: h2 stalls all / h3 stalls 1,
  cache precedence incl. age===maxAge) — all wired into `npm test`. **Fail-first caught a stale test
  premise** (DEFAULT_PATH has **4** routers not 3 → TTL 64→60; the app-layer header is "HTTP" — engine
  right, test fixed). **Sim components + figures delegated to 6 parallel subagents** (each built one
  component against the tested engine + SimShell/FigureStepper, per-sim styles in `src/theme/_p7css/*.css`
  side-effect imports; a shared `_test_ops/S13_BRIEF.md` kept them consistent), then reviewed.
  registryKeys/registry → **58 sims, 28 figs**; +6 katas (`ip-same-subnet`, `switch-learn`,
  `handshake-acks`, `reno-cwnd`, `parse-url`, `cache-decision`) → batch **44** (223 cases; test-katas
  whitelist → ch28); +11 interview Qs (iv-ch26 ×4, iv-ch27 ×4, iv-ch28 ×3). **Adversarial review**
  (subagent: independent Node probes on all 4 engines with hand-computed values + web-verified every dated
  fact + recomputed all 9 quiz keys + hand-checked the 6 katas & 2 figures): **engines, quiz keys and
  katas all correct.** One figure fix (blocking-ish): `http-evolution`'s HTTP/1.1 headline showed the
  **in-flight count (6)** under a "one loss stalls N" banner → changed to the engine's **stall count
  (⌈12/6⌉ = 2), warn tone**, so 2→12→1 reads honestly. Four factual-polish items actioned: end-to-end
  principle credited to **Saltzer/Reed/Clark 1984** (not the 1974 paper); **1988 = Tahoe, Reno added fast
  recovery**; 1986 collapse quantified (**~800×, 32 Kbps→40 bps**, not "×1000"); **ASes ~78,000** (was
  75k); plus a `seq-puzzle` distractor made all-numeric. **verify = typecheck ✓ · lint ✓ (0/0) · qa ✓
  (28 live chapters; 58 sims · 28 figs · 28 quizzes · 141 interview Qs · 44 katas · 10 bosses; mandate
  holds) · test ✓ (21 suites; +test-ch26/27/28, +6 katas → 223 cases) · build ✓** (fresh `dist-s13`:
  TcpLab 21 KB · HttpEvolution 12 · PacketJourney 12 · CacheHeaders 10 · UdpVsTcpRace 8 · SwitchLearning 7
  · LayerCake 5 · UrlJourney 5 · react-vendor 190 · index 697 KB/251 gzip — data still in the main
  bundle, S18/S19 lazy-load note stands). `dist-s13` gitignored (`dist-*`); sandbox `unlink` still blocked
  (fresh `--outDir`); Rolldown linux-arm64 binding present. NOT sandbox-testable: real-browser interaction
  pass — **5-min manual QA after deploy** (packet-journey: DNS resolves then hops advance, TTL ticks at
  routers, MAC changes while IP holds, low-TTL preset drops at hop 1; switch-learning: first frame floods,
  reply forwards, floods flatline; tcp-lab: step the handshake, drop a segment → retransmit, drive the
  Reno sawtooth, then boss → diagnose all 3 traces → 🦈 badge; udp-vs-tcp-race: raise loss → UDP finishes
  first with gaps, TCP later but complete; url-journey: click a phase to expand; cache-headers: toggle
  no-store/etag + age → hit/revalidate/miss; layer-cake + http-evolution auto-play). **PART 7 COMPLETE.
  S13 CLOSED pending user commit — suggested branch `feat/s13-p7-networks`. Next: S14 — P8 · Data: ch.29
  (Databases — `btree-lab` HERO + isolation-anomalies) + ch.30 (Distributed systems — election-toy,
  cap-explorer) + the P8 *Query Planner* boss.**
- **2026-07-08 · S14 (P8 · Data — PART 8 COMPLETE)** — ch.29–30 built to the golden bar; the guide
  leaves the network and turns to *remembering at scale*: one database (tables, a B+-tree index,
  ACID, isolation) then many machines (replication, CAP, consensus, logical clocks), and the **P8
  📇 *Query Planner* boss went live** inside `btree-lab`. **Kickoff (4 AskUserQuestion):** user took
  every recommended pick — (1) **B+-tree** (not a plain B-tree) for `btree-lab`: records in linked
  leaves, range scans walk the leaf chain, the honest structure for a databases chapter; (2)
  **Raft-style leader election** for `election-toy`: terms + randomized timeouts + majority quorum;
  (3) **full INTERACTIVES.md P8 inventory**; (4) **stage-only** hand-off. **ch.29 Databases** (story:
  **Codd's 1970 relational model** → System R/SEQUEL → **Turing Award 1981**, web-verified): the
  full-scan problem, the **B+-tree** (fanout → ~4 levels for a billion rows, records-in-leaves, the
  linked-leaf range walk), the **cost-based planner** (seq vs index vs index-only, driven by
  **selectivity**) with a SQL `EXPLAIN` block, **ACID** (**Härder & Reuter 1983**) on a write-ahead
  log, **isolation levels + the three anomalies** with an ANSI-table formal corner (+ the
  **Berenson-1995** snapshot-isolation/**write-skew** caveat and RC-is-the-default reality),
  nested-loop vs hash **joins**, and a relational-vs-NoSQL(BASE) compare — 9 keyPoints, 4 pitfalls,
  5 sources. **ch.30 Distributed systems** (story: **Lamport's** "a distributed system is one in
  which the failure of a computer you didn't even know existed can render your own unusable" +
  **2013 Turing Award**): **replication** & lag, **partitioning**, **CAP** (**Brewer 2000** /
  **Gilbert & Lynch 2002**) with the *"2-of-3 is the wrong reading"* + **PACELC** (**Abadi 2010**)
  senior beat, **consensus & Raft** (**Ongaro & Ousterhout 2014**) leader election, a **quorum** /
  split-brain senior callout (**R+W>N**, odd clusters, Dynamo 2007), and **Lamport logical clocks**
  (**1978**; the clock condition, and why the converse fails → vector clocks, **Fidge & Mattern
  1988**) — 8 keyPoints, 4 pitfalls, 5 sources. **1 HERO + 5 micro + 1 fig + 2 quiz + 1 boss** —
  `btree-lab` HERO (lab|boss; a real B+-tree engine with split/search/range + an index-vs-full-scan
  scoreboard; **boss grades a chosen index set against three workloads under per-workload page-read
  budgets → over-indexing blows the ingest write budget → `markChallengeDone("boss-p8")` = 📇 Query
  Planner**), `isolation-anomalies` (T1/T2 timeline + the live 3×4 ANSI matrix), `join-visualizer`
  (nested-loop |R|·|S| vs hash |R|+|S| touch counts), `election-toy` (Raft ring; kill-leader +
  3\|2 and even-2\|2 partition presets), `cap-explorer` (CP vs AP replayed on heal), `replication-lag`
  (primary/replica timeline + read-your-writes), and the `logical-clocks` figure (6-frame Lamport
  walk ending on the concurrent pair). **8 pure engines** — `sims/db/{btree,planner,isolation,
  joins}.ts` + `sims/dist/{election,cap,replication,clocks}.ts` — plus **`scripts/test-ch29.ts`**
  (B+-tree invariants on ascending/descending/shuffled/order-3/6, search reads = height, range
  leaf-walk; the planner boss: intended `[ix_customer, ix_status_created]` passes all three, `[]`
  fails on reads, all-four fails on ingest writes; the **ANSI anomaly matrix exactly**; join touch
  counts) and **`scripts/test-ch30.ts`** (quorum + one-leader-per-term; 3\|2 elects / 2\|2 nobody /
  no split-brain; CAP CP-vs-AP; replication lag + RYW; **Lamport [1,2,3,4,1,5]** + the clock
  condition + a genuinely concurrent pair) — both wired into `npm test`; test-katas whitelist → ch30.
  **+4 katas** (`index-range-scan`, `hash-join` [ch29]; `quorum-majority`, `lamport-clock` [ch30])
  → batch **48** (245 cases). **Sim components + figure delegated to 4 parallel subagents** (each
  built one/two files against the already-tested engines + SimShell/FigureStepper; per-sim styles in
  `src/theme/_p8css/*.css` side-effect imports, namespaced `.bt-/.iso-/.jn-/.el-/.cap-/.rep-/.lclk-`
  to avoid the cross-part CSS collisions §10 warns about), then reviewed. registryKeys/registry →
  **64 sims, 29 figs**; +10 interview Qs (iv-ch29 ×5, iv-ch30 ×5); `boss-p8` metadata already present
  from S1. **Adversarial review** (subagent: independent Node probes on all 8 engines with
  hand-computed expectations — **119 partition shapes confirm split-brain never occurs**, 2,541
  replication combinations, the full ANSI matrix hand-traced — plus web-re-verified all 13 dated
  facts, recomputed all 7 quiz keys, and built discriminating wrong-impls for the 4 katas): **zero
  blocking, zero factual, zero wrong quiz keys, zero engine bugs.** One [POLISH] note (kata Big-O
  isn't runtime-enforced by output-only tests) is a pre-existing whole-file pattern → not actioned.
  **verify = typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓ (30 live chapters; 64 sims · 29 figs
  · 30 quizzes · 151 interview Qs · 48 katas · 10 bosses; mandate holds) · test ✓ (23 suites;
  +test-ch29/30, +4 katas → 245 kata cases) · build ✓** (fresh `dist-s14`: BtreeLab 21.5 KB · TcpLab
  22.3 · CompilerPipeline 24.4 · ElectionToy 8.2 · LogicalClocks 7.8 · IsolationAnomalies/JoinVisualizer/
  CapExplorer/ReplicationLag 5–8 KB · react-vendor 190 · index 750 KB/270 gzip — data modules still in
  the main bundle, the S18/S19 lazy-load note stands). `dist-s14` gitignored (`dist-*`); sandbox
  `unlink` still blocked (build uses a fresh `--outDir`); Rolldown linux-arm64 binding present; review
  probes archived under `_test_ops/_s14_review_probes_done/` (gitignored). NOT sandbox-testable:
  real-browser interaction pass — **5-min manual QA after deploy** (btree-lab: insert keys to force a
  split, search lights the root→leaf path, a range walks the linked leaves, read the scoreboard; boss
  → toggle indexes until all three workloads fit → 📇 badge; isolation-anomalies: flip the level and
  watch dirty/non-repeatable/phantom (dis)appear + the matrix cell; join-visualizer: step nested-loop
  vs hash and compare touches; election-toy: kill the leader → re-election, then 3\|2 vs even 2\|2;
  cap-explorer: CP vs AP; replication-lag: drag lag/read + toggle read-your-writes; logical-clocks
  auto-plays and lands on the concurrent pair). **PART 8 COMPLETE. S14 CLOSED pending user commit —
  suggested branch `feat/s14-p8-data`. Next: S15 — P9 · Security: ch.31 (Cryptography — `dh-color-lab`
  HERO + hash-avalanche + cipher-cracker) + ch.32 (Security — injection-sandbox) + the P9 *Codebreaker*
  boss.**
- **2026-07-08 · S15 (P9 · Security — PART 9 COMPLETE)** — ch.31–32 built to the golden bar; the guide
  turns from *keeping* data to *defending* it, and the **P9 🗝️ *Codebreaker* boss went live** inside
  `dh-color-lab`. **Kickoff (4 AskUserQuestion):** (1) `dh-color-lab` number mode = **real small-prime
  modular arithmetic** (p=23, g=5; gᵃ mod p stepped) so the boss's "DH by hand" is honest; (2) SHA-256 =
  **vendored pure-TS** (Claude's recommended best-practice for this repo — identical function in the sim
  and Node tests, synchronous, no deps, offline — **cross-checked against Node's `crypto` and, in review,
  Python `hashlib`**); (3) **full P9 INTERACTIVES.md inventory**; (4) **stage-only** hand-off. **ch.31
  Cryptography** (story: **Diffie–Hellman 1976** + the **GCHQ** secret invention 1969–73 declassified
  1997, web-verified): **Kerckhoffs** (1883), classical ciphers → **frequency analysis / index of
  coincidence**, the **one-time pad** & **Shannon 1949** perfect secrecy, **symmetric AES** (**FIPS 197,
  2001**) + the **key-distribution problem**, an AEAD/nonce-reuse senior beat, **hashing + the avalanche
  effect** (**MD5** & **SHA-1**/*SHAttered* 2017 broken, **SHA-256** standard), the **Diffie–Hellman**
  trapdoor, **RSA 1977** + **digital signatures**, a formal corner (modular exponentiation ↔ discrete-log
  & factoring), the **TLS 1.3** (**RFC 8446, 2018**) tie-back, a symmetric-vs-asymmetric compare, and a
  forward-secrecy/ECC/**post-quantum** senior callout (**Shor** + **NIST FIPS 203 ML-KEM / 204 / 205,
  Aug 2024**) — 9 keyPoints, 4 pitfalls, 6 web-verified sources. **ch.32 Security** (story: the **Morris
  Worm**, 2 Nov 1988, ~10% of ~60,000 hosts): the **adversarial mindset / threat modeling**, **injection**
  as data-becoming-code, its browser twin **XSS** (+ a **CSRF/SameSite** senior beat), **authentication vs
  authorization** (broken access control = OWASP #1) + **password entropy**, the classes crypto can't fix
  (**memory safety** ~70% of severe vulns, **supply chain** — Log4Shell 2021 / xz 2024, **social
  engineering**), **defense in depth**, the **OWASP Top 10:2025** table (**web-verified — Injection is now
  A05; two new categories: Software Supply Chain Failures & Mishandling of Exceptional Conditions; SSRF
  folded into A01**), and a STRIDE/zero-trust senior callout — 9 keyPoints, 4 pitfalls, 5 sources. **1 HERO
  + 5 micro + 3 fig + 2 quiz + 1 boss** — `dh-color-lab` HERO (🎨 paint | 🔢 numbers | 🗝️ boss; paint =
  commutative-mix metaphor, numbers = real modular arithmetic with a stepped `modPowTrace` + an
  Eve-brute-forces `discreteLog`; **boss grades a two-stage challenge — break a Vigenère via the IC/
  frequency tools, then compute the DH shared secret by hand → `markChallengeDone("boss-p9")` = 🗝️
  Codebreaker**), `hash-avalanche` (16×16 bit-flip heat-map + leading-zeros mining toy), `cipher-cracker`
  (Caesar/Vigenère live frequency + IC-per-length crack), `injection-sandbox` (fake login; concat vs
  parameterized with the parsed **WHERE AST** for both + an AUTH-BYPASS verdict), `password-entropy`
  (charset → ideal bits → GPU crack-time table + the `P@ssw0rd` dictionary trap), `xss-demo` (escaped =
  inert text vs raw = *simulated* execution, never real innerHTML/eval), the `rsa-locks` figure (6-frame
  padlock/key walkthrough of the real n=55 key) and `tls-replay` figure (7-step TLS 1.3 handshake labelled
  by primitive), and `defense-layers` (attacker walks concentric rings; a missing layer is the breach).
  **8 pure engines** — `sims/crypto/{dh,sha256,classical,rsa,tls-map}.ts` + `sims/security/{sqli,passwords,
  xss}.ts` (the vendored SHA-256 is FIPS 180-4, cross-checked vs Node `crypto`) — plus **`scripts/
  test-ch31.ts`** (DH agreement over all 21×21 secrets + discreteLog; SHA-256 known vectors & Node-crypto
  match incl. block-boundary lengths 55/56/64 + avalanche ≈½; Vigenère auto-crack recovers key+plaintext,
  IC peaks at the true period; RSA textbook 3233 + sign/verify) and **`scripts/test-ch32.ts`** (concat
  `' OR 1=1--`/`admin'--` bypass vs parameterized safety + the top-level-OR AST; entropy math + crack-time
  monotonicity + the `P@ssw0rd`/`Monkey1` dictionary hits; HTML-escape `&`-first + active-markup detection)
  — both wired into `npm test`; test-katas whitelist → ch31/ch32. **+4 katas** (`caesar-decrypt`, `mod-exp`
  [ch31]; `html-escape`, `constant-time-eq` [ch32]) → batch **52** (269 cases). **+10 interview Qs**
  (iv-ch31 ×5, iv-ch32 ×5); `boss-p9` metadata already present from S1. **9 components delegated to 5
  parallel subagents** (each built its file(s) against the already-tested engines + SimShell/FigureStepper;
  per-sim styles in `src/theme/_p9css/*.css` side-effect imports, namespaced `.dh-/.hav-/.cc-/.inj-/.pw-/
  .xss-/.rsa-/.tls-/.def-`), then reviewed. registryKeys/registry → **70 sims, 32 figs**. **Adversarial
  review** (subagent: independent **Python `hashlib` + `pow`** re-derivation of all 8 engines, a fresh
  319-letter Vigenère auto-crack, the full SQLi bypass/AST matrix; web-re-verified every dated fact incl.
  the **OWASP Top 10:2025** ordering; recomputed all 8 quiz keys; confirmed the 4 new katas' starters fail):
  **zero blocking, zero factual, zero wrong quiz keys, zero engine bugs.** One [POLISH] fixed (`humanTime`
  pluralized "1 hour"/"1 day"/"1 year"). **verify = typecheck ✓ · lint ✓ (0 errors, 0 warnings) · qa ✓
  (32 live chapters; 70 sims · 32 figs · 32 quizzes · 161 interview Qs · 52 katas · 10 bosses; mandate
  holds) · test ✓ (25 suites; +test-ch31/32, +4 katas → 269 kata cases) · build ✓** (fresh `dist-s15`:
  DhColorLab 25.9 KB · CompilerPipeline 24.4 · TcpLab 22.3 · BtreeLab 21.5 · RsaLocks 13.0 · InjectionSandbox
  10.3 · HashAvalanche 9.6 · CipherCracker 9.5 · react-vendor 190 · index 805 KB/291 gzip — data modules
  still in the main bundle, the S18/S19 lazy-load note stands). `dist-s15` gitignored (`/dist-*`); sandbox
  `unlink` still blocked (build uses a fresh `--outDir`); Rolldown linux-arm64 binding present. NOT
  sandbox-testable: real-browser interaction pass — **5-min manual QA after deploy** (dh-color-lab: mix
  paints to one shared color + run numbers mode stepping gᵃ mod p, then the boss — crack the Vigenère via
  the IC chart, do DH by hand → 🗝️ badge; hash-avalanche: edit a char → heat-map ≈½, mine N zero-bits;
  cipher-cracker: encrypt then crack Caesar & Vigenère; injection-sandbox: `' OR 1=1--` bypasses concat but
  not parameterized, watch the AST; password-entropy: `P@ssw0rd` → instant; xss-demo: toggle escaping;
  rsa-locks/tls-replay/defense-layers auto-step). **PART 9 COMPLETE. S15 CLOSED pending user commit —
  suggested branch `feat/s15-p9-security`. Next: S16 — P10 · Intelligence: ch.33–34 (`neural-playground`
  HERO) + P10 boss; web-verify the AI-landscape facts.**

- **2026-07-08 · S16 (P10 · Intelligence — PART 10 COMPLETE)** — ch.33–34 built to the golden bar; the guide
  reaches the top of the stack, from a single learning neuron to the transformers behind modern AI, and the
  **P10 🧠 *Model Tamer* boss went live** inside `neural-playground`. **Kickoff (4 AskUserQuestion):** (1) the
  neural net = **real backprop** — from-scratch forward + backpropagation + gradient descent — and per the
  user's call **live-random init in the app** (a 🎲 reseed button; initialization genuinely matters) with the
  RNG **seed-injectable so the Node tests stay deterministic** (reconciled so CI + the boss contract don't go
  flaky); (2) ch.34's data-driven micros **all real** — a real BPE tokenizer and **real word2vec vectors**
  (attention stays real *math* with clearly-labeled illustrative Q/K/V, since a trained LLM can't run in a
  static sim); (3) frontier = **durable concepts + one dated 'state of play — mid-2026' snapshot box**
  (web-verified); (4) **full scope, Claude commits**. **ch.33 Machine learning** (story: **Perceptron 1958** →
  **Minsky–Papert XOR 1969** → **backprop 1986** Rumelhart/Hinton/Williams): the supervised setup
  (features/model/loss/**generalization**), kNN → a single neuron → a network, **gradient descent** + the
  learning-rate stability threshold η<2/κ, a Formal corner (update rule + BCE∘sigmoid gradient collapses to
  **p−y**), **overfitting** & the train/test discipline, a bias–variance senior beat, and a scikit-learn code
  snippet — 7 keyPoints, 4 pitfalls, 4 sources. **ch.34 Modern AI & frontiers** (story: **"Attention Is All
  You Need," Vaswani et al. 2017**): embeddings & the distributional hypothesis, **BPE tokenization** & the
  "strawberry" letter-counting blind spot, **self-attention** `softmax(QKᵀ/√d)·V`, LLM = next-token
  prediction + **RLHF** alignment, **scaling laws + Chinchilla** (compute-optimal; most models undertrained),
  a capabilities-vs-limits compare, the dated **mid-2026 snapshot** (GPT-5.x / Claude Opus 4.x / Gemini 3.x /
  DeepSeek / Llama 4 / Qwen; 1M-token context common; **MMLU saturated ~92%**; GPQA/SWE-bench/ARC-AGI-2/HLE),
  a Formal corner on scaled dot-product + multi-head attention, and the **computability tie-back to ch.20**
  (no scale escapes the halting problem) — 6 keyPoints, 4 pitfalls, 5 web-verified sources. **1 HERO + 5 micro
  + 2 fig + 2 quiz + 1 boss** — `neural-playground` HERO (datasets linear/circle/xor/spiral; input-feature
  toggles; 0–3 hidden layers with width/activation; live decision-boundary heat-map + loss curve + train/test
  accuracy; **boss grades spiral test-acc ≥95% within ≤3 hidden layers → `markChallengeDone("boss-p10")` = 🧠
  Model Tamer**, winnable two honest ways — 3 raw layers *or* 2 layers + engineered x²/x·y features),
  `gradient-bowl` (drag the start on L=½(a²+κb²); lr → converge/oscillate/explode at the 2/κ line), `knn-toy`
  (k-region map + query vote + leave-one-out accuracy: memorize vs smooth), `tokenizer-toy` (real BPE chips,
  char-vs-token count, the 'strawberry' r-scatter), `attention-heatmap` (real softmax self-attention + n×n
  heat-map; 'it'→'animal' coreference; honesty-labeled toy vectors), `embedding-space` (real word2vec map; the
  analogy builder computes **king−man+woman → queen** in full 64-D), `transformer-block` fig
  (embeddings→attention→FFN→next-token, residuals, stepped) and `scaling-curves` fig (log-log power laws + the
  Chinchilla point). **8 pure engines** — `sims/ml/{rng,datasets,mlp,knn,gd}.ts` (the MLP is real: backprop
  finite-difference-checked to **6.4e-11**, XOR→100%, spiral boss winnable) + `sims/ai/{bpe,attention,
  embeddings}.ts` with vendored `sims/ai/data/{corpus,bpe-data,embeddings-data}.ts` — plus **`scripts/
  test-ch33.ts`** (grad-check tanh+relu; XOR; the spiral boss ≥95% across seed sets on both the 3-raw-layer
  and 2-layer+features paths; decision field; gd converge/oscillate/explode; kNN memorize-vs-smooth) and
  **`scripts/test-ch34.ts`** (BPE **regenerates from the corpus** + round-trips + the 3 scattered r's; the
  vendored embeddings satisfy king−man+woman→queen & 4 more analogies rank-1; attention rows softmax to 1 +
  coreference) — both wired into `npm test`; test-katas whitelist → ch33/ch34. **Real-vectors note:** pretrained
  GloVe was unreachable in the sandbox (gensim-data host blocked; large-corpus web_fetch times out), so the
  vectors are **real word2vec (skip-gram) trained in-repo** on a small bundled corpus (`scripts/
  gen-embeddings.py`, gensim) — genuinely learned (king→queen rank 1), labeled honestly as such (not
  pretrained). **+4 katas** (`sigmoid`, `mse-loss` [ch33]; `softmax`, `cosine-similarity` [ch34]) → batch **56**
  (290 cases). **+10 interview Qs** (iv-ch33 ×5, iv-ch34 ×5), **+2 quizzes** (`why-overfit`, `llm-limits`);
  `boss-p10` metadata already present from S1. **8 components delegated to 6 parallel subagents** (each built
  against the already-tested engines + SimShell/FigureStepper; per-sim CSS in `src/theme/_p10css/*`, namespaced
  `.np-/.gb-/.knn-/.tok-/.att-/.emb-`), then reviewed. registryKeys/registry → **76 sims, 34 figs**.
  **Adversarial review** (subagent: independent **numpy** re-derivation of backprop [grad-check 2.9e-10] and a
  **byte-identical** port of the mulberry32 RNG + spiral, confirming the boss is winnable [27/30 seeds ≥95% on
  ≤3 layers]; recomputed all embeddings analogies from the raw vendored vectors; re-ran BPE + attention;
  recomputed all 6 new quiz keys; re-verified the 4 katas; web-re-verified every dated AI fact): **zero engine
  bugs, zero wrong quiz keys, zero wrong katas, durable history all correct.** One **[BLOCKING]** fixed — the
  ARC-AGI-2 "models score under ~30%" aside was **stale** (mid-2026 self-reported frontier is now 77–85%;
  <30% is only the strict verified private-eval), reworded to drop the contested number. One [POLISH] (MMLU
  "~32% in 2020") left as defensible + source-consistent. **verify = typecheck ✓ · lint ✓ (0 errors, 0
  warnings) · qa ✓ (34 live chapters; 76 sims · 34 figs · 34 quizzes · 171 interview Qs · 56 katas · 10 bosses;
  mandate holds) · test ✓ (27 suites; +test-ch33/34, +4 katas → 290 kata cases) · build ✓** (fresh `dist-s16`:
  DhColorLab 25.9 KB · EmbeddingSpace 25.3 · CompilerPipeline 24.4 · TcpLab 22.3 · BtreeLab 21.5 ·
  NeuralPlayground 18.3 · TransformerBlock 13.9 · TokenizerToy 11.5 · react-vendor 190 · index 854 KB/309 gzip —
  data modules still in the main bundle, the S18/S19 lazy-load note stands). `dist-s16` gitignored (`/dist-*`);
  sandbox `unlink` still blocked (build uses a fresh `--outDir`); Rolldown linux-arm64 binding present. NOT
  sandbox-testable: real-browser interaction pass — **5-min manual QA after deploy** (neural-playground: pick
  the spiral, add 3 hidden layers *or* turn on x²/x·y features, train → boundary morphs, loss falls,
  test ≥ 95% → 🧠 Model Tamer; hit reseed and watch init matter; gradient-bowl: push lr past 2/κ → explode;
  knn-toy: k=1 jagged vs large-k smooth; tokenizer-toy: type 'strawberry' → the r's scatter across tokens;
  attention-heatmap: hover 'it' → lights 'animal'; embedding-space: run king−man+woman → queen;
  transformer-block/scaling-curves auto-step). **PART 10 COMPLETE. S16 CLOSED pending user commit — sandbox git
  is blocked by an unremovable `.git/index.lock` (the §10 unlink constraint), so finalize on the Mac. Suggested
  branch `feat/s16-p10-intelligence`. Next: S17 — P0 + P11: ch.0a/0b (math toolkit) + ch.35 grand traversal +
  boss gallery.**
- **2026-07-08 · S17 (P0 + P11 — GUIDE CONTENT-COMPLETE, all 37 units live)** — the two book-ends: the
  orientation/math on-ramp at the bottom and the capstone at the top. **Kickoff (4 AskUserQuestion):** (1) ch.35's
  grand traversal = a **full stepped HERO** (a real, Node-tested pipeline, each stop deep-linking that part's hero),
  not scrollytelling; (2) ch.0a "The Map" = a **full chapter + a new discipline-map sim** distinct from the landing
  stack; (3) ch.0b math depth = **two real tested heroes + a truth-table micro + an induction figure**; (4) full
  scope in one pass, Claude builds, user finalizes git on the Mac. **ch.0a The Map** (story: *computer* was a job
  title → a new science of computation; the "no more about computers than astronomy is about telescopes" line kept
  and **honestly hedged as disputed attribution**): what CS actually is (computation/information/abstraction, not
  programming), the discipline as a landscape, how the guide works (lens, touchable sims, predict-quizzes, bosses,
  SRS), where to start — **discipline-map HERO** (radial 10-area landscape colored by part accent; click an area →
  light its neighbours + the crossing-idea labels + a link to `#/part/<id>`), **guide-tour** figure (5 mechanisms),
  cs-map-predict quiz, 7 keyPoints, 4 pitfalls, 3 interview Qs, 3 sources. **ch.0b Math toolkit** (story: **Boole
  1854** *Laws of Thought* → **Shannon 1937** switches): logic (¬∧∨→↔, truth tables, De Morgan), sets & functions
  (∪∩×, injective/bijective, 2ⁿ power set), counting (product/sum rules, the four cases), probability (complement
  trick, independence, the birthday paradox), induction (base + step ⇒ all n; strong induction; worked ∑ = n(n+1)/2)
  — **truth-table micro** (a real recursive-descent parser/evaluator with tautology/contradiction/contingency
  classification + a friendly parse-error state), **combinatorics-counter HERO** (P/C/nʳ/stars-and-bars, **exact
  BigInt**, with Pascal's triangle highlighting C(n,r)), **birthday-paradox HERO** (exact curve + a seeded
  **Monte-Carlo that converges onto it**, landmarks 23/57/70 computed live), **induction-ladder** figure (dominoes),
  logic-predict + counting-predict quizzes, a Formal corner, 7 keyPoints, 4 pitfalls, 5 interview Qs, **3 katas**
  (n-choose-k, power-set, permutations-of), 4 sources. **ch.35 The whole picture** (story: from an electron to an
  LLM — the summit): **grand-traversal HERO** — one keystroke traced through **12 stages / all 10 content parts**
  (keypress→gates→CPU→OS→code→data-structure→automaton→network→cipher→database→model→GPU/pixel), each stop recapping
  its layer, its "you built this" tie-back, and a deep-link to that chapter's hero; **boss-gallery** sim (the ten
  part bosses, earned badges lit from localStorage, links to each host); a **leaky-abstractions** senior beat
  (Spolsky); the frontier (quantum: qubit/superposition/interference, narrow speed-ups, error correction) with a
  **quantum-coin** figure and a **web-verified, dated mid-2026 snapshot** (Willow's 105-qubit *below-threshold* QEC;
  IBM roadmap fault tolerance ~2029–2030; RSA-2048 needs ~a **million** physical qubits — falling from ~20M (2019)
  to <1M (Gidney 2025) — so *not here yet*, hence harvest-now-decrypt-later → PQC); whole-stack-predict quiz,
  6 keyPoints, 4 pitfalls, 4 interview Qs, 5 sources. **5 pure engines** — `sims/math/{combinatorics,birthday,logic}.ts`
  (exact BigInt counting; exact birthday curve + seeded mulberry32 MC; a full propositional parser/evaluator with
  equivalence), `sims/capstone/traversal.ts` (the 12-stage pipeline as data with an integrity contract),
  `sims/orientation/map.ts` (the area graph) — plus **`scripts/test-ch0a.ts` / `test-ch0b.ts` / `test-ch35.ts`**
  (map connectivity & part-coverage; factorial/nCr/nPr/stars-bars/Pascal identities, birthday exact vs MC,
  truth-table classification + De Morgan/contrapositive/precedence + parser rejection; traversal referential
  integrity + all-parts coverage + live boss wiring) wired into `npm test`; test-katas whitelist → ch0b. **9
  components delegated to 4 parallel subagents** (6 sims + 3 figures) built against the already-tested engines +
  SimShell/FigureStepper; per-sim CSS in `src/theme/_p0css`/`_p11css` namespaced `.bp-/.cc-/.tt-/.dm-/.gt-/.bg-`,
  figures inline-SVG; deep-links verified (traversal/boss → `#/chapter/…`, map → `#/part/…`). **+3 katas → batch
  59** (307 cases), **+12 interview Qs** (iv-ch0a ×3, iv-ch0b ×5, iv-ch35 ×4) → 183, **+4 quizzes** → 38.
  registryKeys/registry → **82 sims, 37 figs**. **Adversarial review** (self, independent **Python-stdlib oracle**
  + web): combinatorics & birthday match `math.comb/perm/factorial` and a hand-derived birthday curve **exactly**;
  logic classifications, the classic equivalences, precedence (¬>∧>∨>→>↔, → right-assoc) and parser rejection all
  correct; kata doubling/recursive orderings and the float-nCr solution exact for all n≤40; every new quiz key
  recomputed; traversal/map integrity + component deep-links confirmed. **One [BLOCKING] fixed** — the RSA-2048
  cost was stated as *millions* of physical qubits; the leading 2025 estimate is **under a million** (Gidney, down
  20× from ~20M), so it was corrected across the ch.35 callout, keyPoint, quiz and interview, and the Gidney source
  added. **verify = typecheck ✓ · lint ✓ (fixed 1 unused import) · qa ✓ (37 chapters, 37 live; 82 sims · 37 figs ·
  38 quizzes · 183 interview Qs · 59 katas · 10 bosses; mandate holds) · test ✓ (30 suites; +test-ch0a/0b/35, +3
  katas → 307 cases) · build ✓** (fresh `dist-s17`: GrandTraversal 9.0 KB · TruthTable 8.9 · GuideTour 13.1 ·
  QuantumCoin 12.0 · react-vendor 190 · index 913 KB/331 gzip — the S18/S19 lazy-load note still stands). Sandbox
  `unlink` still blocks the default `dist/` (build to a fresh `--outDir` per §10); `.git` locks remain, so finalize
  on the Mac. NOT sandbox-testable: real-browser pass — **5-min manual QA after deploy** (discipline-map: click an
  area → neighbours light + "open part" link; combinatorics-counter: toggle P/C/nʳ/multiset, watch Pascal
  highlight; birthday-paradox: drag n, run Monte-Carlo → dots converge on the curve; truth-table: type `not (p and
  q)` → classification + table, then a garbage string → friendly error; grand-traversal: play → the token walks all
  12 layers, each deep-links its hero, parts light up; boss-gallery: earned badges reflect your progress;
  guide-tour/induction-ladder/quantum-coin auto-step). **PART 0 + PART 11 COMPLETE — the guide is CONTENT-COMPLETE:
  all 11 parts, all 37 units, live.** S17 CLOSED pending user commit. Suggested branch `feat/s17-p0-p11-capstone`.
  Next: S18 — learning-engine completion (SRS review hub, interview bank fill ~60 Q, remaining katas, progress
  export/import, global search).**
