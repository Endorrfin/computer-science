# ⚡ Computer Science — The Interactive Journey

The whole of computer science told as **one bottom-up journey** — electron → logic gate → CPU → program → algorithm → theory → OS → network → data → security → AI — where every core idea is **touchable**: live emulators, steppable simulators, predict-quizzes and boss challenges instead of walls of text. From zero to senior depth in a single guide, switchable with one toggle.

**Live:** https://endorrfin.github.io/computer-science/ &nbsp;·&nbsp; **Stack:** Vite 8 + React 19 + TypeScript (strict) · static, no backend · deployed to GitHub Pages.

> 🏗 **Building in the open.** The full skeleton (11 parts · 37 units · ~126 planned interactives) is live on the map; chapters ship session by session. Live now: **Parts 1–9 (ch.1–32)** — the whole climb from bits → logic gates → a full **8-bit CPU** → code & compilers → algorithms & data structures → theory of computation → operating systems → networks → **data at scale** → **cryptography & security**. Heroes include **bit-inspector**, **logic-sandbox**, the **cpu-8bit** emulator, **sorting-race**, **pathfinder**, **turing-machine**, **scheduler-sim**, **packet-journey**, **btree-lab** and now **dh-color-lab** (Diffie–Hellman as color-mixing *and* real modular arithmetic), with bosses from *Bitreader* through *Query Planner* to the P9 **🗝️ Codebreaker** (break a Vigenère cipher, then perform a key exchange by hand). Next up: **Part 10 · Intelligence** — machine learning and the neural-playground.

**Language / Мова:** [English](https://github.com/Endorrfin/computer-science#-english) · [Українська](https://github.com/Endorrfin/computer-science#-%D1%83%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%81%D1%8C%D0%BA%D0%B0)

---

## 🇬🇧 English

A static, offline-friendly web app: all content is bundled (no backend, no runtime fetches) and deploys to GitHub Pages with no server. Built for a **layered audience** — every chapter teaches from zero with visual-first intuition *and* carries a senior lens with internals, trade-offs and interview-grade depth. Every part is self-contained: 30-second recap boxes replace prerequisites, so you can take only the part you need.

### Features

1. **One bottom-up journey — 11 parts, 37 units.** Electron → gates → CPU → code → algorithms & data structures → theory of computation → operating systems → networks → data at scale → security → AI — closed by a capstone traversal of the entire stack, keypress to pixel.
2. **A Depth lens instead of two books.** A global **Foundations / Senior** toggle re-renders every chapter: hidden senior blocks stay visible as a teaser count. One guide, two courses.
3. **Everything is touchable — and CI enforces it.** The binding inventory ([INTERACTIVES.md](./INTERACTIVES.md)) names ~126 interactives, including 17 hero simulators. Prose only frames them: the `qa:interactivity` gate fails the build on walls of text, or on any chapter shipping without a sim, a steppable figure and a quiz.
4. **Live now: the golden chapter.** Ch.4 *From electricity to gates* — the **logic-sandbox** hero: a drag-drop circuit builder where signals ripple one gate-delay per tick, a truth table derives live from your wiring (feedback loops honestly oscillate), plus a steppable transistor figure and a De Morgan morph sim.
5. **Challenges & bosses.** In-sandbox NAND-only challenges (“build XOR from four NANDs”) checked by a truth-table validator; every part ends in a boss challenge inside its hero sim — earned badges light up the stack map.
6. **Predict-the-behavior quizzes.** Commit an answer *before* the reveal — prediction is what makes it stick; committed answers persist between visits.
7. **Truth-first engines.** Every simulator runs on a deterministic, framework-free model asserted in Node-run tests — gate semantics, signal settling, floating inputs, oscillation and the canonical 4-NAND XOR are all CI-gated.
8. **Flashcards from day one.** Auto-generated from each chapter’s key points; a cross-chapter spaced-repetition hub (SM-2-lite, local-only) arrives later on the roadmap.
9. **A senior interview bank.** Real questions with worked answers, tagged per chapter, growing every session (~60 by ship).
10. **The stack-map landing.** The discipline as a glowing warm→cool spectrum stack with progress rings and boss badges; shareable hash deep links (`#/chapter/ch4`, `#/bosses`).
11. **Accessible, honest about motion.** Keyboard transport on every sim (Space / →), ARIA live status announcements, and `prefers-reduced-motion` switches every animation to step mode.
12. **Static, offline-friendly, private.** No backend, no runtime fetches, no analytics; progress, lens choice and badges live in your browser’s localStorage.

### Built in the open

The working method, decisions and session log live in [CLAUDE.md](./CLAUDE.md); the full interactive inventory in [INTERACTIVES.md](./INTERACTIVES.md). Roadmap: ~19 sessions, hero simulators never ship half-done.

### Run locally

Requires Node 22.6+ (CI runs Node 24).

```bash
npm install
npm run dev      # dev server
npm run verify   # typecheck + lint + qa gates + engine truth-tests + build
```

---

## 🇺🇦 Українська

Уся комп’ютерна наука як **одна подорож знизу вгору** — електрон → логічний вентиль → CPU → програма → алгоритм → теорія → ОС → мережа → дані → безпека → AI — де кожну ключову ідею можна **помацати**: живі емулятори, покрокові симулятори, квізи-передбачення та бос-челенджі замість стін тексту. Від нуля до senior-глибини в одному гайді, перемикається одним тумблером.

Статичний, offline-friendly вебзастосунок: увесь контент вбудований (без бекенду й runtime-запитів), деплой на GitHub Pages без сервера. Збудований для **шаруватої аудиторії** — кожен розділ навчає з нуля через візуальну інтуїцію *і водночас* має senior-лінзу: нутрощі, компроміси, глибина співбесід. Кожна частина самодостатня: 30-секундні recap-блоки замість пререквізитів — беріть лише ту частину, яка потрібна.

### Можливості

1. **Одна подорож знизу вгору — 11 частин, 37 юнітів.** Електрон → вентилі → CPU → код → алгоритми і структури даних → теорія обчислень → операційні системи → мережі → дані в масштабі → безпека → AI — і фінальний капстоун: проліт крізь увесь стек, від натискання клавіші до пікселя.
2. **Лінза глибини замість двох книжок.** Глобальний перемикач **Foundations / Senior** перерендерює кожен розділ; приховані senior-блоки видно як лічильник-тизер. Один гайд — два курси.
3. **Усе можна помацати — і це контролює CI.** Обов’язковий інвентар ([INTERACTIVES.md](./INTERACTIVES.md)) називає ~126 інтерактивів, з них 17 hero-симуляторів. Проза лише обрамлює їх: гейт `qa:interactivity` валить збірку за стіни тексту або розділ без симулятора, покрокової фігури та квізу.
4. **Уже живе: золотий розділ.** Ch.4 *From electricity to gates* — hero **logic-sandbox**: drag-drop конструктор схем, де сигнали розбігаються по одному gate-delay за тік, truth table виводиться наживо з вашої проводки (петлі зворотного зв’язку чесно осцилюють), плюс покрокова фігура транзистора і сим-морф де Моргана.
5. **Челенджі та боси.** Челенджі «тільки з NAND» просто в пісочниці («збери XOR із чотирьох NAND») з валідатором за truth table; кожна частина завершується босом усередині свого hero-симулятора — здобуті бейджі підсвічують мапу.
6. **Квізи-передбачення.** Зафіксуй відповідь *до* розкриття — саме передбачення змушує знання прилипати; відповіді зберігаються між візитами.
7. **Truth-first рушії.** Кожен симулятор працює на детермінованій, незалежній від фреймворка моделі, звіреній Node-тестами — семантика вентилів, стабілізація сигналів, «висячі» входи, осциляція та канонічний XOR із 4 NAND — усе під CI.
8. **Флешкартки з першого дня.** Автогенеруються з key points кожного розділу; крос-розділовий хаб інтервального повторення (SM-2-lite, повністю локальний) — далі за роадмапом.
9. **Senior-банк співбесід.** Реальні запитання з розгорнутими відповідями, тегами за розділами; росте щосесії (~60 до релізу).
10. **Лендінг — мапа стека.** Дисципліна як сяючий спектральний стек (тепле → холодне) з кільцями прогресу і бос-бейджами; шерні deep-links (`#/chapter/ch4`, `#/bosses`).
11. **Доступність і чесність щодо анімації.** Клавіатурне керування кожним симулятором (Space / →), ARIA live-статуси, а `prefers-reduced-motion` переводить усі анімації в покроковий режим.
12. **Статично, офлайн, приватно.** Без бекенду, runtime-запитів і аналітики; прогрес, вибір лінзи та бейджі живуть у localStorage вашого браузера.

### Будується відкрито

Робочий метод, рішення і лог сесій — у [CLAUDE.md](./CLAUDE.md); повний інвентар інтерактивів — в [INTERACTIVES.md](./INTERACTIVES.md). Роадмап: ~19 сесій; hero-симулятори ніколи не виходять напівготовими.

### Запуск локально

Потрібен Node 22.6+ (CI працює на Node 24).

```bash
npm install
npm run dev      # dev-сервер
npm run verify   # typecheck + lint + qa-гейти + truth-тести рушіїв + збірка
```

---

**Vasyl Krupka** · Senior Fullstack Engineer · 🇺🇦
