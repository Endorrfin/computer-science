// Katas — small in-browser coding exercises with instant tests (v1).
//
// Pure data module. Each kata carries a markdown `prompt` (rendered by <Md>),
// a teaching-only TypeScript `signature`, and the RUNNABLE pieces which are
// plain ES2022 JavaScript: a `starter` (a skeleton with a TODO that parses and
// runs but FAILS the tests), a reference `solution` (locked by
// scripts/test-katas.ts), and `tests` whose bodies use the assert helpers
// (assert / assertEqual / assertDeepEqual) and reference the kata's exportName.
//
// This module is imported by BOTH the browser and Node (the test harness), so
// it is ERASABLE-SYNTAX ONLY: `import type` for types, `as const` + unions, no
// enums / namespaces / parameter properties.

export type KataDifficulty = "intro" | "core" | "stretch";

export type KataTest = { name: string; body: string };

export type Kata = {
  id: string;
  chapterId: string;
  title: string;
  difficulty: KataDifficulty;
  tags: string[];
  prompt: string; // markdown
  signature: string; // TS, shown for teaching
  exportName: string; // symbol tests reference, defined by starter/solution
  starter: string; // JS skeleton the user edits
  solution: string; // JS reference, locked by test-katas.ts
  tests: KataTest[];
};

export const KATAS: Kata[] = [
  // ========================================================================
  // ch13 · Arrays & sequences
  // ========================================================================
  {
    id: "binary-search",
    chapterId: "ch13",
    title: "Binary search",
    difficulty: "intro",
    tags: ["arrays", "search", "divide-and-conquer"],
    prompt: `
Return the **index** of \`target\` in a **sorted** ascending array of numbers, or \`-1\` if it is absent.

Halve the search window each step — do not scan linearly. Watch the boundary math: the classic bug here is an off-by-one that either skips the answer or loops forever.

- Time: **O(log n)**. Space: **O(1)**.

### Examples
- \`binarySearch([1, 3, 5, 7, 9], 7)\` → \`3\`
- \`binarySearch([1, 3, 5, 7, 9], 4)\` → \`-1\`
`,
    signature: `function binarySearch(arr: number[], target: number): number`,
    exportName: "binarySearch",
    starter: `function binarySearch(arr, target) {
  // TODO: shrink [lo, hi] until you find target (or the window is empty).
  return -1;
}`,
    solution: `function binarySearch(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    tests: [
      { name: "finds an element in the middle", body: `assertEqual(binarySearch([1, 3, 5, 7, 9], 5), 2);` },
      { name: "finds the first element", body: `assertEqual(binarySearch([1, 3, 5, 7, 9], 1), 0);` },
      { name: "finds the last element", body: `assertEqual(binarySearch([1, 3, 5, 7, 9], 9), 4);` },
      { name: "returns -1 when absent", body: `assertEqual(binarySearch([1, 3, 5, 7, 9], 4), -1);` },
      { name: "handles the empty array", body: `assertEqual(binarySearch([], 1), -1);` },
      { name: "handles a single element (hit and miss)", body: `assertEqual(binarySearch([42], 42), 0); assertEqual(binarySearch([42], 7), -1);` },
      {
        name: "finds every element of a larger array",
        body: `const a = [];
for (let i = 0; i < 100; i++) a.push(i * 2);
for (let i = 0; i < 100; i++) assertEqual(binarySearch(a, i * 2), i, "index " + i);
assertEqual(binarySearch(a, 3), -1, "odd values are absent");`,
      },
    ],
  },
  {
    id: "dynamic-array",
    chapterId: "ch13",
    title: "Dynamic array",
    difficulty: "core",
    tags: ["arrays", "amortized", "memory"],
    prompt: `
Implement a growable array with **amortized O(1)** \`push\` — the structure behind JavaScript arrays and C++ \`vector\`.

Back it with a fixed-size buffer. When the buffer is full, allocate a **new buffer of double the capacity**, copy the elements over, and continue. Doubling makes the *average* cost of a push O(1) even though an occasional push is O(n).

Expose:
- \`push(value)\` — append a value.
- \`get(i)\` — return the element at index \`i\`.
- \`size\` — how many elements are stored (a getter or property).
- \`capacity\` — the current buffer capacity. It **starts at 1** and **doubles** when full: 1 → 2 → 4 → 8 → …

### Example
After pushing 5 values, \`size\` is 5 and \`capacity\` is 8 (1→2→4→8).
`,
    signature: `class DynamicArray {
  size: number;
  capacity: number;
  push(value: number): void;
  get(i: number): number;
}`,
    exportName: "DynamicArray",
    starter: `class DynamicArray {
  constructor() {
    // TODO: start with capacity 1 and size 0.
    this.capacity = 1;
    this.size = 0;
  }
  push(value) {
    // TODO: double the capacity when full, then store the value.
  }
  get(i) {
    // TODO: return the element at index i.
    return undefined;
  }
}`,
    solution: `class DynamicArray {
  constructor() {
    this.capacity = 1;
    this.size = 0;
    this._buf = new Array(this.capacity);
  }
  push(value) {
    if (this.size >= this.capacity) {
      this.capacity *= 2;
      const next = new Array(this.capacity);
      for (let i = 0; i < this.size; i++) next[i] = this._buf[i];
      this._buf = next;
    }
    this._buf[this.size] = value;
    this.size++;
  }
  get(i) {
    if (i < 0 || i >= this.size) return undefined;
    return this._buf[i];
  }
}`,
    tests: [
      {
        name: "starts empty with capacity 1",
        body: `const a = new DynamicArray();
assertEqual(a.size, 0);
assertEqual(a.capacity, 1);`,
      },
      {
        name: "stores and reads back values",
        body: `const a = new DynamicArray();
a.push(10); a.push(20); a.push(30);
assertEqual(a.get(0), 10);
assertEqual(a.get(1), 20);
assertEqual(a.get(2), 30);
assertEqual(a.size, 3);`,
      },
      {
        name: "capacity doubles in the sequence 1,2,4,8",
        body: `const a = new DynamicArray();
const caps = [];
for (let i = 0; i < 5; i++) { a.push(i); caps.push(a.capacity); }
assertDeepEqual(caps, [1, 2, 4, 4, 8], "capacity after each of 5 pushes");`,
      },
      {
        name: "capacity is 1 after a single push",
        body: `const a = new DynamicArray();
a.push(7);
assertEqual(a.capacity, 1);
assertEqual(a.get(0), 7);`,
      },
      {
        name: "keeps all elements intact across many grows",
        body: `const a = new DynamicArray();
for (let i = 0; i < 100; i++) a.push(i * i);
assertEqual(a.size, 100);
for (let i = 0; i < 100; i++) assertEqual(a.get(i), i * i, "index " + i);`,
      },
      {
        name: "capacity is 128 after 100 pushes",
        body: `const a = new DynamicArray();
for (let i = 0; i < 100; i++) a.push(i);
assertEqual(a.capacity, 128);`,
      },
      {
        name: "out-of-range get returns undefined",
        body: `const a = new DynamicArray();
a.push(1);
assertEqual(a.get(5), undefined);
assertEqual(a.get(-1), undefined);`,
      },
    ],
  },
  {
    id: "dedup-sorted",
    chapterId: "ch13",
    title: "Dedup a sorted array in place",
    difficulty: "core",
    tags: ["arrays", "two-pointer", "in-place"],
    prompt: `
Remove duplicates from a **sorted** array **in place** and return the new length. The first \`length\` slots of the array must hold the unique values in their original order; slots past that may hold anything.

Use the **two-pointer** technique: a slow pointer marks where the next unique value goes, a fast pointer scans ahead.

- Time: **O(n)**. Space: **O(1)** (no second array).

### Example
Given \`[1, 1, 2, 3, 3, 3, 4]\`, after \`dedup(arr)\` returns \`4\`, the first four elements are \`[1, 2, 3, 4]\`.
`,
    signature: `function dedup(arr: number[]): number`,
    exportName: "dedup",
    starter: `function dedup(arr) {
  // TODO: two pointers — overwrite duplicates, return the unique count.
  return arr.length;
}`,
    solution: `function dedup(arr) {
  if (arr.length === 0) return 0;
  let slow = 0;
  for (let fast = 1; fast < arr.length; fast++) {
    if (arr[fast] !== arr[slow]) {
      slow++;
      arr[slow] = arr[fast];
    }
  }
  return slow + 1;
}`,
    tests: [
      {
        name: "collapses runs of duplicates",
        body: `const a = [1, 1, 2, 3, 3, 3, 4];
const n = dedup(a);
assertEqual(n, 4);
assertDeepEqual(a.slice(0, n), [1, 2, 3, 4]);`,
      },
      {
        name: "leaves an already-unique array unchanged",
        body: `const a = [1, 2, 3, 4, 5];
const n = dedup(a);
assertEqual(n, 5);
assertDeepEqual(a.slice(0, n), [1, 2, 3, 4, 5]);`,
      },
      {
        name: "collapses an all-same array to length 1",
        body: `const a = [7, 7, 7, 7];
const n = dedup(a);
assertEqual(n, 1);
assertEqual(a[0], 7);`,
      },
      {
        name: "handles the empty array",
        body: `assertEqual(dedup([]), 0);`,
      },
      {
        name: "handles a single element",
        body: `const a = [9];
assertEqual(dedup(a), 1);
assertEqual(a[0], 9);`,
      },
      {
        name: "handles negatives and duplicate boundaries",
        body: `const a = [-3, -3, -1, 0, 0, 2];
const n = dedup(a);
assertEqual(n, 4);
assertDeepEqual(a.slice(0, n), [-3, -1, 0, 2]);`,
      },
    ],
  },

  // ========================================================================
  // ch14 · Linear structures
  // ========================================================================
  {
    id: "stack-impl",
    chapterId: "ch14",
    title: "Stack",
    difficulty: "intro",
    tags: ["stack", "LIFO"],
    prompt: `
Implement a **LIFO stack** (last in, first out).

- \`push(value)\` — put a value on top.
- \`pop()\` — remove and return the top value; return \`undefined\` if empty.
- \`peek()\` — return the top value **without** removing it; \`undefined\` if empty.
- \`size\` — the number of items.

All four operations are **O(1)**.

### Example
Push 1, 2, 3 then \`pop()\` returns \`3\`, then \`peek()\` returns \`2\`.
`,
    signature: `class Stack {
  size: number;
  push(value: number): void;
  pop(): number | undefined;
  peek(): number | undefined;
}`,
    exportName: "Stack",
    starter: `class Stack {
  constructor() {
    // TODO: back the stack with an array.
    this.size = 0;
  }
  push(value) {
    // TODO
  }
  pop() {
    // TODO
    return undefined;
  }
  peek() {
    // TODO
    return undefined;
  }
}`,
    solution: `class Stack {
  constructor() {
    this._items = [];
    this.size = 0;
  }
  push(value) {
    this._items.push(value);
    this.size = this._items.length;
  }
  pop() {
    if (this._items.length === 0) return undefined;
    const v = this._items.pop();
    this.size = this._items.length;
    return v;
  }
  peek() {
    if (this._items.length === 0) return undefined;
    return this._items[this._items.length - 1];
  }
}`,
    tests: [
      {
        name: "pops in last-in-first-out order",
        body: `const s = new Stack();
s.push(1); s.push(2); s.push(3);
assertEqual(s.pop(), 3);
assertEqual(s.pop(), 2);
assertEqual(s.pop(), 1);`,
      },
      {
        name: "peek returns the top without removing it",
        body: `const s = new Stack();
s.push(10); s.push(20);
assertEqual(s.peek(), 20);
assertEqual(s.size, 2);
assertEqual(s.peek(), 20);`,
      },
      {
        name: "size tracks pushes and pops",
        body: `const s = new Stack();
assertEqual(s.size, 0);
s.push(1); s.push(2);
assertEqual(s.size, 2);
s.pop();
assertEqual(s.size, 1);`,
      },
      {
        name: "pop on empty returns undefined",
        body: `const s = new Stack();
assertEqual(s.pop(), undefined);`,
      },
      {
        name: "peek on empty returns undefined",
        body: `const s = new Stack();
assertEqual(s.peek(), undefined);`,
      },
      {
        name: "survives interleaved push/pop",
        body: `const s = new Stack();
s.push(1);
assertEqual(s.pop(), 1);
assertEqual(s.pop(), undefined);
s.push(2); s.push(3);
assertEqual(s.peek(), 3);
assertEqual(s.size, 2);`,
      },
    ],
  },
  {
    id: "queue-ring",
    chapterId: "ch14",
    title: "Ring-buffer queue",
    difficulty: "stretch",
    tags: ["queue", "FIFO", "ring-buffer"],
    prompt: `
Implement a **fixed-capacity FIFO queue** backed by a **ring buffer** (circular array). Head and tail indices wrap around modulo the capacity, so no element is ever shifted.

- \`new RingQueue(capacity)\`
- \`enqueue(value)\` — add to the back; return \`false\` if the queue is **full**, otherwise \`true\`.
- \`dequeue()\` — remove and return the front value; \`undefined\` if **empty**.
- \`size\` — current number of items.
- \`capacity\` — the fixed maximum.

All operations are **O(1)** with no array shifting.

### Example
With capacity 2: enqueue(1)→true, enqueue(2)→true, enqueue(3)→**false** (full). dequeue()→1, then enqueue(3)→true (space reused via wrap-around).
`,
    signature: `class RingQueue {
  size: number;
  capacity: number;
  constructor(capacity: number);
  enqueue(value: number): boolean;
  dequeue(): number | undefined;
}`,
    exportName: "RingQueue",
    starter: `class RingQueue {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    // TODO: allocate the buffer and head/tail indices.
  }
  enqueue(value) {
    // TODO: reject when full, otherwise store at the tail and wrap.
    return false;
  }
  dequeue() {
    // TODO: return undefined when empty, otherwise take from the head and wrap.
    return undefined;
  }
}`,
    solution: `class RingQueue {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this._buf = new Array(capacity);
    this._head = 0;
    this._tail = 0;
  }
  enqueue(value) {
    if (this.size === this.capacity) return false;
    this._buf[this._tail] = value;
    this._tail = (this._tail + 1) % this.capacity;
    this.size++;
    return true;
  }
  dequeue() {
    if (this.size === 0) return undefined;
    const v = this._buf[this._head];
    this._head = (this._head + 1) % this.capacity;
    this.size--;
    return v;
  }
}`,
    tests: [
      {
        name: "dequeues in first-in-first-out order",
        body: `const q = new RingQueue(4);
q.enqueue(1); q.enqueue(2); q.enqueue(3);
assertEqual(q.dequeue(), 1);
assertEqual(q.dequeue(), 2);
assertEqual(q.dequeue(), 3);`,
      },
      {
        name: "enqueue returns false when full",
        body: `const q = new RingQueue(2);
assertEqual(q.enqueue(1), true);
assertEqual(q.enqueue(2), true);
assertEqual(q.enqueue(3), false);
assertEqual(q.size, 2);`,
      },
      {
        name: "dequeue returns undefined when empty",
        body: `const q = new RingQueue(3);
assertEqual(q.dequeue(), undefined);`,
      },
      {
        name: "reuses freed slots via wrap-around",
        body: `const q = new RingQueue(2);
q.enqueue(1); q.enqueue(2);
assertEqual(q.dequeue(), 1);
assertEqual(q.enqueue(3), true, "space freed by dequeue is reusable");
assertEqual(q.dequeue(), 2);
assertEqual(q.dequeue(), 3);`,
      },
      {
        name: "size tracks enqueue and dequeue",
        body: `const q = new RingQueue(3);
assertEqual(q.size, 0);
q.enqueue(1); q.enqueue(2);
assertEqual(q.size, 2);
q.dequeue();
assertEqual(q.size, 1);`,
      },
      {
        name: "survives many wrap cycles",
        body: `const q = new RingQueue(3);
let expected = 0;
for (let i = 0; i < 50; i++) {
  q.enqueue(i);
  if (q.size === 3 || i === 49) {
    while (q.size > 0) { assertEqual(q.dequeue(), expected); expected++; }
  }
}
assertEqual(expected, 50);`,
      },
    ],
  },
  {
    id: "is-balanced",
    chapterId: "ch14",
    title: "Balanced brackets",
    difficulty: "core",
    tags: ["stack", "parsing"],
    prompt: `
Return \`true\` if the brackets in a string are **balanced**, else \`false\`. Three kinds must match and nest correctly: \`()\`, \`[]\`, \`{}\`. Non-bracket characters are ignored.

Use a **stack**: push each opener; on a closer, the top of the stack must be its matching opener. At the end the stack must be empty.

- Time: **O(n)**. Space: **O(n)**.

### Examples
- \`isBalanced("{[()]}")\` → \`true\`
- \`isBalanced("([)]")\` → \`false\` (wrong nesting)
- \`isBalanced("(")\` → \`false\` (never closed)
`,
    signature: `function isBalanced(input: string): boolean`,
    exportName: "isBalanced",
    starter: `function isBalanced(input) {
  // TODO: push openers, match each closer against the stack top.
  return false;
}`,
    solution: `function isBalanced(input) {
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  for (const ch of input) {
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);
    } else if (ch === ")" || ch === "]" || ch === "}") {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
    tests: [
      { name: "empty string is balanced", body: `assertEqual(isBalanced(""), true);` },
      { name: "nested mixed brackets are balanced", body: `assertEqual(isBalanced("{[()]}"), true);` },
      { name: "ignores non-bracket characters", body: `assertEqual(isBalanced("a(b)[c]{d}"), true);` },
      { name: "wrong nesting order is unbalanced", body: `assertEqual(isBalanced("([)]"), false);` },
      { name: "an unclosed opener is unbalanced", body: `assertEqual(isBalanced("("), false); assertEqual(isBalanced("{[}"), false);` },
      { name: "a stray closer is unbalanced", body: `assertEqual(isBalanced(")"), false); assertEqual(isBalanced("()]"), false);` },
      { name: "deeply nested balances", body: `assertEqual(isBalanced("((((()))))"), true); assertEqual(isBalanced("((((())))"), false);` },
    ],
  },
  {
    id: "hashmap-chaining",
    chapterId: "ch14",
    title: "Hash map (separate chaining)",
    difficulty: "stretch",
    tags: ["hashmap", "chaining", "hashing"],
    prompt: `
Implement a **hash map** with **separate chaining** for collision resolution. Keys are strings.

Keep an array of buckets; each bucket is a list of \`[key, value]\` entries. Hash a key to a bucket index, then search that bucket's list for the key.

- \`set(k, v)\` — insert or update.
- \`get(k)\` — the stored value, or \`undefined\`.
- \`has(k)\` — \`true\` / \`false\`.
- \`delete(k)\` — remove the key; return \`true\` if it was present, else \`false\`.
- \`size\` — number of distinct keys.

Average operations are **O(1)** with a reasonable hash and load factor.

### Example
\`set("a", 1)\`, \`set("a", 2)\` leaves \`size\` at 1 and \`get("a")\` returning 2 (update, not insert).
`,
    signature: `class HashMap {
  size: number;
  set(k: string, v: unknown): void;
  get(k: string): unknown;
  has(k: string): boolean;
  delete(k: string): boolean;
}`,
    exportName: "HashMap",
    starter: `class HashMap {
  constructor() {
    this.size = 0;
    // TODO: create the bucket array.
  }
  _hash(k) {
    // A simple string hash — reuse it in every method.
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
    return Math.abs(h) % this._buckets.length;
  }
  set(k, v) {
    // TODO
  }
  get(k) {
    // TODO
    return undefined;
  }
  has(k) {
    // TODO
    return false;
  }
  delete(k) {
    // TODO
    return false;
  }
}`,
    solution: `class HashMap {
  constructor() {
    this.size = 0;
    this._buckets = new Array(8);
    for (let i = 0; i < this._buckets.length; i++) this._buckets[i] = [];
  }
  _hash(k) {
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
    return Math.abs(h) % this._buckets.length;
  }
  set(k, v) {
    const bucket = this._buckets[this._hash(k)];
    for (const entry of bucket) {
      if (entry[0] === k) { entry[1] = v; return; }
    }
    bucket.push([k, v]);
    this.size++;
  }
  get(k) {
    const bucket = this._buckets[this._hash(k)];
    for (const entry of bucket) if (entry[0] === k) return entry[1];
    return undefined;
  }
  has(k) {
    const bucket = this._buckets[this._hash(k)];
    for (const entry of bucket) if (entry[0] === k) return true;
    return false;
  }
  delete(k) {
    const bucket = this._buckets[this._hash(k)];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === k) { bucket.splice(i, 1); this.size--; return true; }
    }
    return false;
  }
}`,
    tests: [
      {
        name: "stores and retrieves values",
        body: `const m = new HashMap();
m.set("a", 1); m.set("b", 2);
assertEqual(m.get("a"), 1);
assertEqual(m.get("b"), 2);
assertEqual(m.size, 2);`,
      },
      {
        name: "get on a missing key returns undefined",
        body: `const m = new HashMap();
assertEqual(m.get("nope"), undefined);
assertEqual(m.has("nope"), false);`,
      },
      {
        name: "set updates an existing key without growing size",
        body: `const m = new HashMap();
m.set("a", 1);
m.set("a", 99);
assertEqual(m.get("a"), 99);
assertEqual(m.size, 1);`,
      },
      {
        name: "has reflects presence",
        body: `const m = new HashMap();
m.set("x", 0);
assertEqual(m.has("x"), true);
assertEqual(m.has("y"), false);`,
      },
      {
        name: "delete removes a key and reports success",
        body: `const m = new HashMap();
m.set("a", 1); m.set("b", 2);
assertEqual(m.delete("a"), true);
assertEqual(m.has("a"), false);
assertEqual(m.get("a"), undefined);
assertEqual(m.size, 1);
assertEqual(m.delete("a"), false, "deleting an absent key returns false");`,
      },
      {
        name: "handles many keys that collide across buckets",
        body: `const m = new HashMap();
for (let i = 0; i < 200; i++) m.set("key" + i, i);
assertEqual(m.size, 200);
for (let i = 0; i < 200; i++) assertEqual(m.get("key" + i), i, "key" + i);
assertEqual(m.get("key200"), undefined);`,
      },
      {
        name: "stores falsy values distinctly from absence",
        body: `const m = new HashMap();
m.set("zero", 0);
assertEqual(m.has("zero"), true);
assertEqual(m.get("zero"), 0);`,
      },
    ],
  },
  {
    id: "two-sum",
    chapterId: "ch14",
    title: "Two sum",
    difficulty: "core",
    tags: ["hashmap", "arrays"],
    prompt: `
Given an array of numbers and a \`target\`, return the **indices** \`[i, j]\` (with \`i < j\`) of the two numbers that add up to \`target\`, or \`null\` if no such pair exists.

Do it in a **single pass** with a map from value → index: for each number, check whether \`target - number\` was already seen.

- Time: **O(n)**. Space: **O(n)**.

### Examples
- \`twoSum([2, 7, 11, 15], 9)\` → \`[0, 1]\`
- \`twoSum([3, 2, 4], 6)\` → \`[1, 2]\`
- \`twoSum([1, 2, 3], 99)\` → \`null\`
`,
    signature: `function twoSum(nums: number[], target: number): [number, number] | null`,
    exportName: "twoSum",
    starter: `function twoSum(nums, target) {
  // TODO: one pass + a map from value to index.
  return null;
}`,
    solution: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}`,
    tests: [
      { name: "finds the classic pair", body: `assertDeepEqual(twoSum([2, 7, 11, 15], 9), [0, 1]);` },
      { name: "finds a pair not at the start", body: `assertDeepEqual(twoSum([3, 2, 4], 6), [1, 2]);` },
      { name: "returns null when no pair sums to target", body: `assertEqual(twoSum([1, 2, 3], 99), null);` },
      { name: "uses two equal values", body: `assertDeepEqual(twoSum([3, 3], 6), [0, 1]);` },
      { name: "handles negatives and zero", body: `assertDeepEqual(twoSum([-3, 4, 3, 90], 0), [0, 2]);` },
      {
        name: "returns indices with i < j",
        body: `const r = twoSum([0, 4, 3, 0], 0);
assert(r !== null, "a zero pair exists");
assert(r[0] < r[1], "first index is smaller");
assertDeepEqual(r, [0, 3]);`,
      },
      { name: "empty and single-element arrays yield null", body: `assertEqual(twoSum([], 0), null); assertEqual(twoSum([5], 5), null);` },
    ],
  },
  {
    id: "reverse-list",
    chapterId: "ch14",
    title: "Reverse a linked list",
    difficulty: "core",
    tags: ["linked-list", "pointers", "in-place"],
    prompt: `
Reverse a **singly linked list in place** and return the **new head**. A node is \`{ value, next }\`, and the last node's \`next\` is \`null\`.

Walk the list once, re-pointing each node's \`next\` to the node before it. Keep three references — previous, current, and the saved next — so you never lose the rest of the list.

- Time: **O(n)**. Space: **O(1)**.

### Helper expectations
You can build a list from an array and read it back with these shapes (the tests use them):

- \`fromArray([1, 2, 3])\` → \`{ value: 1, next: { value: 2, next: { value: 3, next: null } } }\`
- \`toArray(head)\` walks \`next\` until \`null\`, collecting \`value\`s.

### Example
\`reverseList(fromArray([1, 2, 3]))\` is the head of a list whose values are \`[3, 2, 1]\`.
`,
    signature: `type ListNode = { value: number; next: ListNode | null };
function reverseList(head: ListNode | null): ListNode | null`,
    exportName: "reverseList",
    starter: `function reverseList(head) {
  // TODO: re-point each node's next to the previous node; return the new head.
  return head;
}`,
    solution: `function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
    tests: [
      {
        name: "reverses a three-node list",
        body: `function fromArray(a) { let head = null; for (let i = a.length - 1; i >= 0; i--) head = { value: a[i], next: head }; return head; }
function toArray(h) { const out = []; while (h !== null) { out.push(h.value); h = h.next; } return out; }
assertDeepEqual(toArray(reverseList(fromArray([1, 2, 3]))), [3, 2, 1]);`,
      },
      {
        name: "reverses a longer list",
        body: `function fromArray(a) { let head = null; for (let i = a.length - 1; i >= 0; i--) head = { value: a[i], next: head }; return head; }
function toArray(h) { const out = []; while (h !== null) { out.push(h.value); h = h.next; } return out; }
assertDeepEqual(toArray(reverseList(fromArray([1, 2, 3, 4, 5]))), [5, 4, 3, 2, 1]);`,
      },
      {
        name: "a single node reverses to itself",
        body: `const head = { value: 42, next: null };
const r = reverseList(head);
assertEqual(r.value, 42);
assertEqual(r.next, null);`,
      },
      {
        name: "an empty list stays null",
        body: `assertEqual(reverseList(null), null);`,
      },
      {
        name: "the old head becomes the tail",
        body: `function fromArray(a) { let head = null; for (let i = a.length - 1; i >= 0; i--) head = { value: a[i], next: head }; return head; }
const head = fromArray([1, 2, 3]);
const r = reverseList(head);
assertEqual(r.value, 3, "new head is the old tail");
// old head (value 1) is now the last node
assertEqual(head.next, null, "old head now points to null");`,
      },
      {
        name: "reversing twice restores the original order",
        body: `function fromArray(a) { let head = null; for (let i = a.length - 1; i >= 0; i--) head = { value: a[i], next: head }; return head; }
function toArray(h) { const out = []; while (h !== null) { out.push(h.value); h = h.next; } return out; }
assertDeepEqual(toArray(reverseList(reverseList(fromArray([1, 2, 3, 4])))), [1, 2, 3, 4]);`,
      },
    ],
  },
  {
    id: "lru-cache",
    chapterId: "ch14",
    title: "LRU cache",
    difficulty: "stretch",
    tags: ["cache", "hashmap", "linked-list", "eviction"],
    prompt: `
Build a **Least-Recently-Used cache** with **O(1)** \`get\` and \`put\`. When the cache is full, inserting a new key evicts the **least recently used** entry.

- \`new LRUCache(capacity)\`
- \`get(k)\` — return the value, or \`-1\` if absent. A \`get\` **counts as a use** (makes the key most-recently-used).
- \`put(k, v)\` — insert or update. On overflow, evict the least-recently-used key. A \`put\` also counts as a use.

A JavaScript \`Map\` preserves insertion order, so you can treat its first key as the least-recently-used and re-insert a key to mark it most-recently-used — that gives O(1) operations without hand-rolling a linked list.

### Example
\`\`\`
c = new LRUCache(2)
c.put(1, 1); c.put(2, 2)
c.get(1)        // 1  → key 1 is now most-recent
c.put(3, 3)     // evicts key 2 (least-recent)
c.get(2)        // -1 (evicted)
\`\`\`
`,
    signature: `class LRUCache {
  constructor(capacity: number);
  get(key: number): number;
  put(key: number, value: number): void;
}`,
    exportName: "LRUCache",
    starter: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    // TODO: a Map keeps insertion order — use it as the recency list.
    this._map = new Map();
  }
  get(key) {
    // TODO: return -1 if absent; otherwise mark the key most-recently-used.
    return -1;
  }
  put(key, value) {
    // TODO: insert/update, mark most-recent, and evict the oldest when over capacity.
  }
}`,
    solution: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this._map = new Map();
  }
  get(key) {
    if (!this._map.has(key)) return -1;
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value); // re-insert → most recently used
    return value;
  }
  put(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    if (this._map.size > this.capacity) {
      const oldest = this._map.keys().next().value; // first key = LRU
      this._map.delete(oldest);
    }
  }
}`,
    tests: [
      {
        name: "stores and reads back within capacity",
        body: `const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
assertEqual(c.get(1), 1);
assertEqual(c.get(2), 2);`,
      },
      {
        name: "returns -1 for an absent key",
        body: `const c = new LRUCache(2);
assertEqual(c.get(99), -1);`,
      },
      {
        name: "evicts the least-recently-used on overflow",
        body: `const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
c.put(3, 3); // capacity exceeded → evict key 1 (oldest, never used since insert)
assertEqual(c.get(1), -1, "key 1 was evicted");
assertEqual(c.get(2), 2);
assertEqual(c.get(3), 3);`,
      },
      {
        name: "get refreshes recency so the other key is evicted",
        body: `const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
assertEqual(c.get(1), 1); // key 1 now most-recent
c.put(3, 3);              // evict key 2, not key 1
assertEqual(c.get(2), -1, "key 2 was evicted");
assertEqual(c.get(1), 1);
assertEqual(c.get(3), 3);`,
      },
      {
        name: "put updates value and refreshes recency",
        body: `const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
c.put(1, 10); // update key 1 AND make it most-recent
assertEqual(c.get(1), 10);
c.put(3, 3);  // evict key 2
assertEqual(c.get(2), -1);
assertEqual(c.get(1), 10);`,
      },
      {
        name: "put alone refreshes recency (no read in between)",
        body: `const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
c.put(1, 10); // update key 1 — this alone must make it most-recent
c.put(3, 3);  // no get() in between → must evict key 2 (LRU), NOT key 1
assertEqual(c.get(1), 10, "key 1 survived: put made it most-recent");
assertEqual(c.get(2), -1, "key 2 was least-recently-used");
assertEqual(c.get(3), 3);`,
      },
      {
        name: "capacity of 1 evicts on every new key",
        body: `const c = new LRUCache(1);
c.put(1, 1);
assertEqual(c.get(1), 1);
c.put(2, 2);
assertEqual(c.get(1), -1);
assertEqual(c.get(2), 2);`,
      },
      {
        name: "handles a longer access sequence",
        body: `const c = new LRUCache(3);
c.put(1, 1); c.put(2, 2); c.put(3, 3);
assertEqual(c.get(2), 2);      // recency: 1,3,2 (2 most-recent)
c.put(4, 4);                   // evict 1 (LRU)
assertEqual(c.get(1), -1);
assertEqual(c.get(3), 3);
assertEqual(c.get(4), 4);
assertEqual(c.get(2), 2);`,
      },
    ],
  },

  // ========================================================================
  // ch15 · Trees & heaps
  // ========================================================================
  {
    id: "bst-insert",
    chapterId: "ch15",
    title: "BST insert",
    difficulty: "core",
    tags: ["trees", "bst", "recursion"],
    prompt: `
Insert \`value\` into a **binary search tree** and return the (possibly new) root.

A node is \`{ value, left, right }\`. Walk down comparing: go **left** for smaller, **right** for larger, and attach a new leaf where you fall off. Duplicates are ignored (this tree holds a set).

- Time: **O(height)**. An in-order walk of a BST yields the keys **sorted**.
`,
    signature: `type BSTNode = { value: number; left: BSTNode | null; right: BSTNode | null };
function bstInsert(root: BSTNode | null, value: number): BSTNode`,
    exportName: "bstInsert",
    starter: `function bstInsert(root, value) {
  // TODO: if root is null, create the node; else recurse left/right by comparison.
  return root;
}`,
    solution: `function bstInsert(root, value) {
  if (root === null) return { value, left: null, right: null };
  if (value < root.value) root.left = bstInsert(root.left, value);
  else if (value > root.value) root.right = bstInsert(root.right, value);
  return root;
}`,
    tests: [
      { name: "inserting into an empty tree makes a single node", body: `assertDeepEqual(bstInsert(null, 5), { value: 5, left: null, right: null });` },
      {
        name: "an in-order walk of the built tree is sorted",
        body: `function inorder(n){ return n ? [...inorder(n.left), n.value, ...inorder(n.right)] : []; }
let r = null; for (const v of [5,3,8,1,4,7,9,2]) r = bstInsert(r, v);
assertDeepEqual(inorder(r), [1,2,3,4,5,7,8,9]);`,
      },
      {
        name: "structure follows the comparisons",
        body: `let r = null; for (const v of [5,3,8]) r = bstInsert(r, v);
assertEqual(r.value, 5); assertEqual(r.left.value, 3); assertEqual(r.right.value, 8);`,
      },
      {
        name: "duplicates are ignored",
        body: `let r = null; for (const v of [5,3,5,3,5]) r = bstInsert(r, v);
function count(n){ return n ? 1 + count(n.left) + count(n.right) : 0; }
assertEqual(count(r), 2);`,
      },
    ],
  },
  {
    id: "validate-bst",
    chapterId: "ch15",
    title: "Validate a BST",
    difficulty: "core",
    tags: ["trees", "bst", "invariants"],
    prompt: `
Return \`true\` if a binary tree is a **valid binary search tree**: every node's value is greater than **all** values in its left subtree and less than **all** in its right subtree.

The classic wrong answer only checks each node against its *immediate* children — that misses a grandchild that violates an ancestor's bound. Thread a \`(low, high)\` range down instead.

- A node is \`{ value, left, right }\`. Empty and single-node trees are valid.
`,
    signature: `function isValidBST(root: BSTNode | null): boolean`,
    exportName: "isValidBST",
    starter: `function isValidBST(root) {
  // NOTE: this only checks immediate children — it wrongly accepts a deep violation.
  // TODO: thread a (low, high) bound down the recursion instead.
  if (root === null) return true;
  if (root.left && root.left.value >= root.value) return false;
  if (root.right && root.right.value <= root.value) return false;
  return isValidBST(root.left) && isValidBST(root.right);
}`,
    solution: `function isValidBST(root) {
  function check(n, lo, hi) {
    if (n === null) return true;
    if (n.value <= lo || n.value >= hi) return false;
    return check(n.left, lo, n.value) && check(n.right, n.value, hi);
  }
  return check(root, -Infinity, Infinity);
}`,
    tests: [
      {
        name: "accepts a valid BST",
        body: `function node(v,l,r){ return { value:v, left:l||null, right:r||null }; }
assert(isValidBST(node(10, node(5, node(1), node(7)), node(15))) === true, "should be valid");`,
      },
      { name: "empty and single-node trees are valid", body: `function node(v,l,r){ return { value:v, left:l||null, right:r||null }; }
assert(isValidBST(null) === true); assert(isValidBST(node(42)) === true);` },
      {
        name: "catches a DEEP violation an ancestor bound would reject",
        body: `function node(v,l,r){ return { value:v, left:l||null, right:r||null }; }
// 12 is in 10's LEFT subtree but exceeds 10 — invalid, though it is a valid child of 5
assert(isValidBST(node(10, node(5, node(1), node(12)), node(15))) === false, "deep violation must be caught");`,
      },
      {
        name: "rejects an out-of-order immediate child",
        body: `function node(v,l,r){ return { value:v, left:l||null, right:r||null }; }
assert(isValidBST(node(10, node(5), node(8))) === false, "right child < root");`,
      },
    ],
  },
  {
    id: "bst-level-order",
    chapterId: "ch15",
    title: "Level-order traversal",
    difficulty: "core",
    tags: ["trees", "bfs", "queue"],
    prompt: `
Return the node values in **level order** (breadth-first): root first, then every node at depth 1 left-to-right, then depth 2, and so on.

Use a **queue** (ch.14): dequeue a node, record it, enqueue its children. This is the tree version of BFS you'll meet again on graphs (ch.17).

- A node is \`{ value, left, right }\`. Return \`[]\` for an empty tree.
`,
    signature: `function levelOrder(root: BSTNode | null): number[]`,
    exportName: "levelOrder",
    starter: `function levelOrder(root) {
  // TODO: use a queue — dequeue a node, push its value, enqueue its children.
  return [];
}`,
    solution: `function levelOrder(root) {
  const out = [];
  const q = root ? [root] : [];
  while (q.length > 0) {
    const n = q.shift();
    out.push(n.value);
    if (n.left) q.push(n.left);
    if (n.right) q.push(n.right);
  }
  return out;
}`,
    tests: [
      {
        name: "visits level by level, left to right",
        body: `function node(v,l,r){ return { value:v, left:l||null, right:r||null }; }
const t = node(1, node(2, node(4), node(5)), node(3, null, node(6)));
assertDeepEqual(levelOrder(t), [1,2,3,4,5,6]);`,
      },
      { name: "empty tree is empty", body: `assertDeepEqual(levelOrder(null), []);` },
      { name: "single node", body: `function node(v,l,r){ return { value:v, left:l||null, right:r||null }; }
assertDeepEqual(levelOrder(node(7)), [7]);` },
    ],
  },
  {
    id: "min-heap",
    chapterId: "ch15",
    title: "Min-heap (priority queue)",
    difficulty: "stretch",
    tags: ["heap", "priority-queue", "array"],
    prompt: `
Implement a **binary min-heap** backed by an array. Expose:
- \`push(v)\` — add a value (sift it **up** while smaller than its parent).
- \`pop()\` — remove and return the **minimum** (move the last element to the root and sift it **down**); return \`undefined\` when empty.
- \`peek()\` — the current minimum without removing it.
- \`size\` — how many values are stored.

Index math (0-based): parent of \`i\` is \`(i-1)>>1\`; children are \`2i+1\` and \`2i+2\`. Push and pop are **O(log n)**.
`,
    signature: `class MinHeap {
  size: number;
  push(v: number): void;
  pop(): number | undefined;
  peek(): number | undefined;
}`,
    exportName: "MinHeap",
    starter: `class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) { this.a.push(v); }        // TODO: sift up to restore heap order
  pop() { return this.a.pop(); }     // TODO: remove the MIN (root), not the last element
}`,
    solution: `class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a.length ? this.a[0] : undefined; }
  push(v) {
    const a = this.a; a.push(v); let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[i] < a[p]) { const t = a[i]; a[i] = a[p]; a[p] = t; i = p; } else break;
    }
  }
  pop() {
    const a = this.a; if (a.length === 0) return undefined;
    const min = a[0]; const last = a.pop();
    if (a.length > 0) {
      a[0] = last; let i = 0; const n = a.length;
      for (;;) {
        let s = i; const l = 2 * i + 1; const r = 2 * i + 2;
        if (l < n && a[l] < a[s]) s = l;
        if (r < n && a[r] < a[s]) s = r;
        if (s === i) break;
        const t = a[i]; a[i] = a[s]; a[s] = t; i = s;
      }
    }
    return min;
  }
}`,
    tests: [
      {
        name: "pops in ascending order (it is a priority queue)",
        body: `const h = new MinHeap();
for (const v of [5,3,8,1,9,2]) h.push(v);
assertEqual(h.size, 6);
assertEqual(h.peek(), 1);
const out = []; while (h.size > 0) out.push(h.pop());
assertDeepEqual(out, [1,2,3,5,8,9]);`,
      },
      {
        name: "a new global minimum climbs to the root",
        body: `const h = new MinHeap();
for (const v of [4,6,8,10]) h.push(v);
h.push(1);
assertEqual(h.peek(), 1);`,
      },
      { name: "pop on empty returns undefined", body: `const h = new MinHeap(); assertEqual(h.pop(), undefined);` },
      {
        name: "handles duplicates",
        body: `const h = new MinHeap();
for (const v of [2,1,2,1,2]) h.push(v);
const out = []; while (h.size > 0) out.push(h.pop());
assertDeepEqual(out, [1,1,2,2,2]);`,
      },
    ],
  },
  {
    id: "heapify",
    chapterId: "ch15",
    title: "Build-heap in O(n)",
    difficulty: "stretch",
    tags: ["heap", "floyd", "in-place"],
    prompt: `
Turn an arbitrary array into a **min-heap in place** using Floyd's bottom-up method, and return it.

Sift **down** every internal node, starting from the **last** one (index \`⌊n/2⌋−1\`) back to the root. Leaves are already trivial heaps, so you skip them — which is why this is **O(n)**, not O(n log n).

- After \`heapify\`, every parent ≤ its children, and \`arr[0]\` is the minimum.
`,
    signature: `function heapify(arr: number[]): number[]`,
    exportName: "heapify",
    starter: `function heapify(arr) {
  // TODO: sift down each internal node from ⌊n/2⌋−1 back to 0.
  return arr;
}`,
    solution: `function heapify(arr) {
  const n = arr.length;
  function siftDown(i) {
    for (;;) {
      let s = i; const l = 2 * i + 1; const r = 2 * i + 2;
      if (l < n && arr[l] < arr[s]) s = l;
      if (r < n && arr[r] < arr[s]) s = r;
      if (s === i) break;
      const t = arr[i]; arr[i] = arr[s]; arr[s] = t; i = s;
    }
  }
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(i);
  return arr;
}`,
    tests: [
      {
        name: "produces a valid min-heap",
        body: `function isMinHeap(a){ for (let i=1;i<a.length;i++){ if (a[i] < a[(i-1)>>1]) return false; } return true; }
const h = heapify([9,4,7,1,8,3,6,2,5,0]);
assert(isMinHeap(h), "every parent <= its children");
assertEqual(h[0], 0);`,
      },
      {
        name: "preserves the multiset of values",
        body: `const src = [9,4,7,1,8,3,6,2,5,0];
assertDeepEqual([...heapify(src.slice())].sort((a,b)=>a-b), [0,1,2,3,4,5,6,7,8,9]);`,
      },
      {
        name: "fixes a small out-of-order array",
        body: `function isMinHeap(a){ for (let i=1;i<a.length;i++){ if (a[i] < a[(i-1)>>1]) return false; } return true; }
assert(isMinHeap(heapify([3,1,2])), "small case");
assert(isMinHeap(heapify([5,4,3,2,1])), "reversed");`,
      },
    ],
  },
  {
    id: "trie-autocomplete",
    chapterId: "ch15",
    title: "Trie with autocomplete",
    difficulty: "stretch",
    tags: ["trie", "strings", "prefix"],
    prompt: `
Build a **trie** (prefix tree) exposing:
- \`insert(word)\` — store a word, one character per edge.
- \`search(word)\` — is this exact word stored? (A path existing is **not** enough — a word needs an end-marker.)
- \`startsWith(prefix)\` — does any stored word begin with this prefix?
- \`autocomplete(prefix)\` — all stored words beginning with the prefix, **sorted**.

Lookups are **O(word length)**, independent of how many words are stored; shared prefixes share nodes.
`,
    signature: `class Trie {
  insert(word: string): void;
  search(word: string): boolean;
  startsWith(prefix: string): boolean;
  autocomplete(prefix: string): string[];
}`,
    exportName: "Trie",
    starter: `class Trie {
  constructor() { this.root = { children: {}, end: false }; }
  insert(word) {
    let n = this.root;
    for (const c of word) { if (!n.children[c]) n.children[c] = { children: {}, end: false }; n = n.children[c]; }
    n.end = true;
  }
  _walk(prefix) { let n = this.root; for (const c of prefix) { if (!n.children[c]) return null; n = n.children[c]; } return n; }
  search(word) { return this._walk(word) !== null; }   // TODO: a word needs an end-marker, not just a path
  startsWith(prefix) { return this._walk(prefix) !== null; }
  autocomplete(prefix) { return []; }                  // TODO: collect the subtree under the prefix
}`,
    solution: `class Trie {
  constructor() { this.root = { children: {}, end: false }; }
  insert(word) {
    let n = this.root;
    for (const c of word) { if (!n.children[c]) n.children[c] = { children: {}, end: false }; n = n.children[c]; }
    n.end = true;
  }
  _walk(prefix) { let n = this.root; for (const c of prefix) { if (!n.children[c]) return null; n = n.children[c]; } return n; }
  search(word) { const n = this._walk(word); return n !== null && n.end === true; }
  startsWith(prefix) { return this._walk(prefix) !== null; }
  autocomplete(prefix) {
    const start = this._walk(prefix);
    if (start === null) return [];
    const out = [];
    const dfs = (node, acc) => {
      if (node.end) out.push(acc);
      for (const c of Object.keys(node.children).sort()) dfs(node.children[c], acc + c);
    };
    dfs(start, prefix);
    return out;
  }
}`,
    tests: [
      {
        name: "search distinguishes a word from a mere prefix",
        body: `const t = new Trie();
for (const w of ["car","card","care","cat","dog","do"]) t.insert(w);
assert(t.search("car") === true, "car is a word");
assert(t.search("ca") === false, "ca is only a prefix");
assert(t.search("do") === true, "do is both a word and a prefix");`,
      },
      {
        name: "startsWith checks path existence",
        body: `const t = new Trie();
for (const w of ["car","cat"]) t.insert(w);
assert(t.startsWith("ca") === true);
assert(t.startsWith("z") === false);`,
      },
      {
        name: "autocomplete collects the subtree, sorted",
        body: `const t = new Trie();
for (const w of ["car","card","care","cat","dog","do"]) t.insert(w);
assertDeepEqual(t.autocomplete("car"), ["car","card","care"]);
assertDeepEqual(t.autocomplete("do"), ["do","dog"]);
assertDeepEqual(t.autocomplete("z"), []);`,
      },
    ],
  },

  // ========================================================================
  // ch16 · Sorting & searching
  // ========================================================================
  {
    id: "binary-search-lower-bound",
    chapterId: "ch16",
    title: "Lower bound",
    difficulty: "core",
    tags: ["search", "binary-search", "boundaries"],
    prompt: `
Return the **first index** \`i\` in a **sorted** array where \`arr[i] >= target\` — the **insertion point**. If every element is smaller, return \`arr.length\`.

This is \`lower_bound\` / \`bisect_left\`: with duplicates it lands on the **first** occurrence; for an absent value it gives where it *would* go. Use a half-open window \`[lo, hi)\` and never return early.

- Time: **O(log n)**.
`,
    signature: `function lowerBound(arr: number[], target: number): number`,
    exportName: "lowerBound",
    starter: `function lowerBound(arr, target) {
  // TODO: half-open window [lo, hi); shrink until lo === hi = the insertion point.
  return 0;
}`,
    solution: `function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
    tests: [
      {
        name: "lands on the FIRST of duplicate keys",
        body: `const a = [1,2,2,2,4,4,5];
assertEqual(lowerBound(a, 2), 1);
assertEqual(lowerBound(a, 4), 4);`,
      },
      {
        name: "absent value returns its insertion point",
        body: `const a = [1,2,2,2,4,4,5];
assertEqual(lowerBound(a, 3), 4);
assertEqual(lowerBound(a, 0), 0);
assertEqual(lowerBound(a, 99), 7);`,
      },
      { name: "empty array returns 0", body: `assertEqual(lowerBound([], 5), 0);` },
      {
        name: "insertion point is a valid split (everything left is < target)",
        body: `const a = [2,4,6,8,10];
for (const t of [1,4,5,10,11]) {
  const i = lowerBound(a, t);
  assert(a.slice(0, i).every((v) => v < t), "left of " + i + " all < " + t);
}`,
      },
    ],
  },
  {
    id: "merge-two-sorted",
    chapterId: "ch16",
    title: "Merge two sorted arrays",
    difficulty: "intro",
    tags: ["sorting", "merge", "two-pointer"],
    prompt: `
Merge two **sorted** arrays into one sorted array — the **merge** step at the heart of merge sort.

Walk two pointers, always taking the smaller front element. Do **not** concatenate and re-sort; that throws away the fact that both inputs are already ordered (and costs O(n log n) instead of O(n)).

- Time: **O(n + m)**.
`,
    signature: `function merge(a: number[], b: number[]): number[]`,
    exportName: "merge",
    starter: `function merge(a, b) {
  // TODO: two pointers — repeatedly take the smaller front element.
  return [...a, ...b];
}`,
    solution: `function merge(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}`,
    tests: [
      { name: "interleaves two runs", body: `assertDeepEqual(merge([1,3,5],[2,4,6]), [1,2,3,4,5,6]);` },
      { name: "handles an empty input", body: `assertDeepEqual(merge([],[1,2]), [1,2]); assertDeepEqual(merge([1,2],[]), [1,2]);` },
      { name: "handles duplicates across both", body: `assertDeepEqual(merge([1,1,2],[1,3]), [1,1,1,2,3]);` },
      { name: "handles both empty", body: `assertDeepEqual(merge([],[]), []);` },
      {
        name: "merges unequal lengths",
        body: `assertDeepEqual(merge([1,5,9,12],[3,4]), [1,3,4,5,9,12]);`,
      },
    ],
  },
  {
    id: "quickselect",
    chapterId: "ch16",
    title: "Quickselect (k-th smallest)",
    difficulty: "stretch",
    tags: ["selection", "partition", "divide-and-conquer"],
    prompt: `
Return the **k-th smallest** element (1-indexed) of an unsorted array in expected **O(n)** — without fully sorting.

Use quicksort's **partition**, but recurse into only the **one** side that contains rank k. Each step discards about half the array, giving expected O(n). Do not mutate the caller's array.

### Example
- \`quickselect([7,2,9,4,1], 1)\` → \`1\` (min); \`quickselect([7,2,9,4,1], 3)\` → \`4\` (median)
`,
    signature: `function quickselect(arr: number[], k: number): number`,
    exportName: "quickselect",
    starter: `function quickselect(arr, k) {
  // TODO: partition around a pivot; recurse into the side holding rank k.
  return arr[k - 1]; // wrong: that's the k-th element by POSITION, not by value
}`,
    solution: `function quickselect(arr, k) {
  const a = arr.slice();
  let lo = 0, hi = a.length - 1;
  const target = k - 1;
  while (lo <= hi) {
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (a[j] < pivot) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; }
    }
    const t = a[i]; a[i] = a[hi]; a[hi] = t;
    if (i === target) return a[i];
    if (i < target) lo = i + 1;
    else hi = i - 1;
  }
  return undefined;
}`,
    tests: [
      {
        name: "matches the sorted array at every rank",
        body: `const a = [7,2,9,4,1,8,3];
const sorted = [...a].sort((x,y)=>x-y);
for (let k=1;k<=a.length;k++) assertEqual(quickselect(a,k), sorted[k-1], "k="+k);`,
      },
      { name: "min and max", body: `const a=[7,2,9,4,1]; assertEqual(quickselect(a,1),1); assertEqual(quickselect(a,5),9);` },
      { name: "single element", body: `assertEqual(quickselect([42],1), 42);` },
      {
        name: "does not mutate the input array",
        body: `const b=[3,1,2]; quickselect(b,2); assertDeepEqual(b,[3,1,2]);`,
      },
      {
        name: "handles duplicates",
        body: `const a=[5,5,1,5,3]; const s=[...a].sort((x,y)=>x-y);
for (let k=1;k<=a.length;k++) assertEqual(quickselect(a,k), s[k-1], "k="+k);`,
      },
    ],
  },
  {
    id: "counting-sort",
    chapterId: "ch16",
    title: "Counting sort",
    difficulty: "core",
    tags: ["sorting", "non-comparison", "counting"],
    prompt: `
Sort an array of **non-negative integers** with **counting sort** — no element comparisons.

Tally how many of each key there are, then rebuild the array from the tallies (a key that appears 3 times contributes three copies, in order). Runs in **O(n + k)** where k is the largest key.

- This is how you beat the Ω(n log n) comparison bound when keys are small integers.
`,
    signature: `function countingSort(arr: number[]): number[]`,
    exportName: "countingSort",
    starter: `function countingSort(arr) {
  // TODO: tally counts[key]++ over 0..max, then emit each key that many times.
  return arr;
}`,
    solution: `function countingSort(arr) {
  if (arr.length === 0) return [];
  let max = 0;
  for (const v of arr) if (v > max) max = v;
  const count = new Array(max + 1).fill(0);
  for (const v of arr) count[v]++;
  const out = [];
  for (let v = 0; v <= max; v++) for (let c = 0; c < count[v]; c++) out.push(v);
  return out;
}`,
    tests: [
      { name: "sorts with duplicates", body: `assertDeepEqual(countingSort([3,1,2,3,0]), [0,1,2,3,3]);` },
      { name: "empty and single", body: `assertDeepEqual(countingSort([]), []); assertDeepEqual(countingSort([5]), [5]);` },
      { name: "all equal", body: `assertDeepEqual(countingSort([2,2,2]), [2,2,2]);` },
      {
        name: "matches a comparison sort on a larger array",
        body: `const big = []; for (let i=0;i<60;i++) big.push((i*7) % 12);
assertDeepEqual(countingSort(big), [...big].sort((a,b)=>a-b));`,
      },
    ],
  },
  {
    id: "bfs-shortest-path",
    chapterId: "ch17",
    title: "Shortest path by hops (BFS)",
    difficulty: "core",
    tags: ["graphs", "bfs", "shortest-path"],
    prompt: `
On an **undirected** graph with \`n\` nodes (0…n−1) and an edge list, return the **fewest edges** on any path from \`start\` to \`goal\`, or **−1** if the goal is unreachable.

This is BFS: flood outward in rings of increasing hop-distance so the first time you reach a node is via a shortest path. A direct-edge check or a DFS won't do — only breadth-first order guarantees minimality.

### Example
- \`shortestHops(4, [[0,1],[1,2],[2,3]], 0, 3)\` → \`3\`
- \`shortestHops(4, [[0,1],[1,2],[2,3],[0,3]], 0, 3)\` → \`1\` (the shortcut)
`,
    signature: `function shortestHops(n: number, edges: number[][], start: number, goal: number): number`,
    exportName: "shortestHops",
    starter: `function shortestHops(n, edges, start, goal) {
  // TODO: BFS from start; return the hop distance to goal, or -1.
  if (start === goal) return 0;
  // wrong: this only finds goals that are a SINGLE edge away
  for (const [u, v] of edges) {
    if ((u === start && v === goal) || (v === start && u === goal)) return 1;
  }
  return -1;
}`,
    solution: `function shortestHops(n, edges, start, goal) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
  const dist = Array.from({ length: n }, () => -1);
  dist[start] = 0;
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    if (u === goal) return dist[u];
    for (const w of adj[u]) if (dist[w] === -1) { dist[w] = dist[u] + 1; q.push(w); }
  }
  return dist[goal];
}`,
    tests: [
      { name: "start equals goal is 0 hops", body: `assertEqual(shortestHops(3, [[0,1],[1,2]], 1, 1), 0);` },
      { name: "a straight line of edges", body: `assertEqual(shortestHops(4, [[0,1],[1,2],[2,3]], 0, 3), 3);` },
      { name: "takes the shortcut, not the long way", body: `assertEqual(shortestHops(4, [[0,1],[1,2],[2,3],[0,3]], 0, 3), 1);` },
      { name: "two equal-length paths give 2", body: `assertEqual(shortestHops(4, [[0,1],[1,2],[0,3],[3,2]], 0, 2), 2);` },
      { name: "unreachable goal is -1", body: `assertEqual(shortestHops(3, [[0,1]], 0, 2), -1);` },
    ],
  },
  {
    id: "topo-order",
    chapterId: "ch17",
    title: "Topological order (Kahn)",
    difficulty: "core",
    tags: ["graphs", "topological-sort", "dag"],
    prompt: `
Given a directed graph with \`n\` nodes and edges \`[u, v]\` meaning **u must come before v**, return **any valid topological order** (every edge points forward), or the **empty array** if the graph has a cycle.

Use Kahn's algorithm: start from the in-degree-0 nodes, peel one, decrement its successors, repeat. If you can't peel all \`n\` nodes, a cycle blocked you.

### Example
- \`topoOrder(4, [[0,1],[0,2],[1,3],[2,3]])\` → e.g. \`[0,1,2,3]\`
- \`topoOrder(2, [[0,1],[1,0]])\` → \`[]\` (cycle)
`,
    signature: `function topoOrder(n: number, edges: number[][]): number[]`,
    exportName: "topoOrder",
    starter: `function topoOrder(n, edges) {
  // TODO: peel in-degree-0 nodes (Kahn). This identity order ignores the edges.
  return Array.from({ length: n }, (_, i) => i);
}`,
    solution: `function topoOrder(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indeg = Array.from({ length: n }, () => 0);
  for (const [u, v] of edges) { adj[u].push(v); indeg[v]++; }
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const order = [];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    order.push(u);
    for (const w of adj[u]) if (--indeg[w] === 0) q.push(w);
  }
  return order.length === n ? order : [];
}`,
    tests: [
      {
        name: "diamond DAG: all nodes present, edges point forward",
        body: `const o = topoOrder(4, [[0,1],[0,2],[1,3],[2,3]]);
const p = {}; o.forEach((x,i)=>p[x]=i);
assertEqual(o.length, 4, "all nodes present");
assert([[0,1],[0,2],[1,3],[2,3]].every(([u,v]) => p[u] < p[v]), "every edge points forward");`,
      },
      {
        name: "respects a forced order (not identity)",
        body: `const o = topoOrder(3, [[2,0],[0,1]]);
const p = {}; o.forEach((x,i)=>p[x]=i);
assert(p[2] < p[0] && p[0] < p[1], "must place 2 before 0 before 1");`,
      },
      { name: "a cycle returns []", body: `assertDeepEqual(topoOrder(2, [[0,1],[1,0]]), []);` },
      { name: "single node, no edges", body: `assertDeepEqual(topoOrder(1, []), [0]);` },
    ],
  },
  {
    id: "lcs-length",
    chapterId: "ch18",
    title: "Longest common subsequence (DP)",
    difficulty: "core",
    tags: ["dynamic-programming", "strings"],
    prompt: `
Return the length of the **longest common subsequence** of two strings — the longest sequence of characters appearing left-to-right (not necessarily contiguously) in **both**.

Fill a DP table: \`dp[i][j]\` is the LCS of the first \`i\` of \`a\` and first \`j\` of \`b\`. On a match, \`dp[i][j] = dp[i−1][j−1] + 1\`; otherwise \`max(dp[i−1][j], dp[i][j−1])\`. Counting shared letters ignores **order** and overcounts.

### Example
- \`lcsLength("AGCAT", "GAC")\` → \`2\`
- \`lcsLength("AB", "BA")\` → \`1\` (not 2)
`,
    signature: `function lcsLength(a: string, b: string): number`,
    exportName: "lcsLength",
    starter: `function lcsLength(a, b) {
  // TODO: DP over prefixes. This counts shared letters ignoring ORDER — wrong.
  let c = 0; const bb = b.split("");
  for (const ch of a) { const k = bb.indexOf(ch); if (k >= 0) { bb.splice(k, 1); c++; } }
  return c;
}`,
    solution: `function lcsLength(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp[m][n];
}`,
    tests: [
      { name: "classic AGCAT / GAC", body: `assertEqual(lcsLength("AGCAT", "GAC"), 2);` },
      { name: "ABCBDAB / BDCAB is 4", body: `assertEqual(lcsLength("ABCBDAB", "BDCAB"), 4);` },
      { name: "order matters: AB / BA is 1, not 2", body: `assertEqual(lcsLength("AB", "BA"), 1);` },
      { name: "empty string is 0", body: `assertEqual(lcsLength("", "ABC"), 0);` },
      { name: "identical strings", body: `assertEqual(lcsLength("ABC", "ABC"), 3);` },
    ],
  },
  {
    id: "coin-change-min",
    chapterId: "ch18",
    title: "Fewest coins (DP, where greedy fails)",
    difficulty: "core",
    tags: ["dynamic-programming", "greedy"],
    prompt: `
Return the **minimum number of coins** (each denomination usable unlimited times) that sum to \`amount\`, or **−1** if it can't be made.

Greedy — take the biggest coin that fits — is optimal only on canonical systems; on \`{1,3,4}\` making 6 it gives 4+1+1 = 3 when 3+3 = 2 is better. Do DP over every amount from 0 to \`amount\`.

### Example
- \`minCoins([1,3,4], 6)\` → \`2\` (greedy would say 3)
- \`minCoins([2], 3)\` → \`-1\`
`,
    signature: `function minCoins(coins: number[], amount: number): number`,
    exportName: "minCoins",
    starter: `function minCoins(coins, amount) {
  // TODO: DP. This greedy takes the biggest coin first — wrong on {1,3,4}, 6.
  const desc = [...coins].sort((x, y) => y - x);
  let rem = amount, count = 0;
  for (const c of desc) { while (rem >= c) { rem -= c; count++; } }
  return rem === 0 ? count : -1;
}`,
    solution: `function minCoins(coins, amount) {
  const INF = Infinity;
  const best = new Array(amount + 1).fill(INF);
  best[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a && best[a - c] + 1 < best[a]) best[a] = best[a - c] + 1;
  return best[amount] === INF ? -1 : best[amount];
}`,
    tests: [
      { name: "US cents 63 → 6", body: `assertEqual(minCoins([1,5,10,25], 63), 6);` },
      { name: "greedy trap {1,3,4} at 6 → 2", body: `assertEqual(minCoins([1,3,4], 6), 2);` },
      { name: "impossible amount → -1", body: `assertEqual(minCoins([2], 3), -1);` },
      { name: "11 from {1,2,5} → 3", body: `assertEqual(minCoins([1,2,5], 11), 3);` },
      { name: "zero amount → 0", body: `assertEqual(minCoins([5], 0), 0);` },
    ],
  },
];

export function kataById(id: string): Kata | undefined {
  return KATAS.find((k) => k.id === id);
}

export function katasForChapter(chapterId: string): Kata[] {
  return KATAS.filter((k) => k.chapterId === chapterId);
}
