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
  // ========================================================================
  // ch19 · Automata & regular languages
  // ========================================================================
  {
    id: "dfa-accepts",
    chapterId: "ch19",
    title: "Run a DFA",
    difficulty: "intro",
    tags: ["automata", "state-machine"],
    prompt: `
Simulate a **deterministic finite automaton**. Given its transition table \`delta\` (a map \`state → symbol → nextState\`), a \`start\` state, the list of \`accept\` states, and an \`input\` string, return whether the DFA **accepts** the input.

Walk one transition per symbol from \`start\`. If a needed transition is missing, the string is rejected (the machine falls into an implicit dead state). Accept only if the final state is in \`accept\`.

- Time: **O(n)** in the input length. Space: **O(1)**.

### Example
- Even-number-of-1s DFA \`{E:{"0":"E","1":"O"}, O:{"0":"O","1":"E"}}\`, start \`E\`, accept \`["E"]\`: accepts \`"11"\`, rejects \`"1"\`.
`,
    signature: `function dfaAccepts(delta: Record<string, Record<string, string>>, start: string, accept: string[], input: string): boolean`,
    exportName: "dfaAccepts",
    starter: `function dfaAccepts(delta, start, accept, input) {
  // TODO: follow one transition per symbol; reject on a missing transition.
  return false;
}`,
    solution: `function dfaAccepts(delta, start, accept, input) {
  let cur = start;
  for (const ch of input) {
    const next = delta[cur] && delta[cur][ch];
    if (next === undefined) return false;
    cur = next;
  }
  return accept.includes(cur);
}`,
    tests: [
      { name: "even 1s: accepts \"\" and \"11\"", body: `const d = { E: { "0": "E", "1": "O" }, O: { "0": "O", "1": "E" } };
assertEqual(dfaAccepts(d, "E", ["E"], ""), true);
assertEqual(dfaAccepts(d, "E", ["E"], "11"), true);` },
      { name: "even 1s: rejects odd counts, accepts even", body: `const d = { E: { "0": "E", "1": "O" }, O: { "0": "O", "1": "E" } };
assertEqual(dfaAccepts(d, "E", ["E"], "1"), false);
assertEqual(dfaAccepts(d, "E", ["E"], "0110"), true);` },
      { name: "missing transition rejects", body: `const d = { S: { "a": "S" } }; // no rule for 'b'
assertEqual(dfaAccepts(d, "S", ["S"], "aaa"), true);
assertEqual(dfaAccepts(d, "S", ["S"], "aba"), false);` },
      { name: "ends-in-ab DFA", body: `const d = { q0: { a: "q1", b: "q0" }, q1: { a: "q1", b: "q2" }, q2: { a: "q1", b: "q0" } };
assertEqual(dfaAccepts(d, "q0", ["q2"], "ab"), true);
assertEqual(dfaAccepts(d, "q0", ["q2"], "aab"), true);
assertEqual(dfaAccepts(d, "q0", ["q2"], "aba"), false);` },
    ],
  },
  {
    id: "binary-divisible-by-three",
    chapterId: "ch19",
    title: "Divisible by three (as an automaton)",
    difficulty: "core",
    tags: ["automata", "modular-arithmetic"],
    prompt: `
Return whether a **binary string** (most-significant bit first) represents a number **divisible by 3** — using only a running remainder, no \`parseInt\`, no big numbers.

This is a 3-state automaton in disguise: keep the value **mod 3** in one variable. Reading a bit \`b\` updates the remainder \`r → (2·r + b) mod 3\`. Accept when the final remainder is 0. The empty string is value 0 (divisible).

- Time: **O(n)**. Space: **O(1)** — three states, exactly what a DFA would use.
`,
    signature: `function divisibleByThree(bits: string): boolean`,
    exportName: "divisibleByThree",
    starter: `function divisibleByThree(bits) {
  // TODO: carry the remainder mod 3; r -> (2*r + bit) % 3.
  return true;
}`,
    solution: `function divisibleByThree(bits) {
  let r = 0;
  for (const ch of bits) r = (r * 2 + (ch === "1" ? 1 : 0)) % 3;
  return r === 0;
}`,
    tests: [
      { name: "empty string is 0 (divisible)", body: `assertEqual(divisibleByThree(""), true);` },
      { name: "small values", body: `assertEqual(divisibleByThree("0"), true);
assertEqual(divisibleByThree("11"), true);
assertEqual(divisibleByThree("110"), true);
assertEqual(divisibleByThree("1001"), true);` },
      { name: "non-multiples", body: `assertEqual(divisibleByThree("1"), false);
assertEqual(divisibleByThree("10"), false);
assertEqual(divisibleByThree("101"), false);` },
      { name: "agrees with arithmetic for 0..63", body: `for (let v = 0; v < 64; v++) {
  const bits = v.toString(2);
  assertEqual(divisibleByThree(bits), v % 3 === 0, "value " + v);
}` },
    ],
  },
  // ========================================================================
  // ch20 · Computability
  // ========================================================================
  {
    id: "anbn-decide",
    chapterId: "ch20",
    title: "Decide aⁿbⁿ",
    difficulty: "core",
    tags: ["computability", "counting"],
    prompt: `
Decide the language **{ aⁿbⁿ : n ≥ 0 }** — some a's, then an equal number of b's, nothing else. Return \`true\` for \`""\`, \`"ab"\`, \`"aabb"\`, \`"aaabbb"\`; \`false\` otherwise.

A finite automaton **cannot** do this (ch.19's pumping-lemma result), but with a counter it's trivial — which is exactly the extra power a Turing machine's tape gives. Count the leading a's, then require exactly that many b's and nothing left over.

- Time: **O(n)**. Space: **O(1)** (a counter).
`,
    signature: `function isAnBn(s: string): boolean`,
    exportName: "isAnBn",
    starter: `function isAnBn(s) {
  // TODO: count leading a's, then require the same number of b's and no leftovers.
  return true;
}`,
    solution: `function isAnBn(s) {
  let i = 0;
  while (s[i] === "a") i++;
  const a = i;
  while (s[i] === "b") i++;
  return i === s.length && i - a === a;
}`,
    tests: [
      { name: "members", body: `for (const s of ["", "ab", "aabb", "aaabbb", "aaaabbbb"]) assertEqual(isAnBn(s), true, JSON.stringify(s));` },
      { name: "wrong counts", body: `for (const s of ["a", "b", "aab", "abb", "aaabb", "aabbb"]) assertEqual(isAnBn(s), false, JSON.stringify(s));` },
      { name: "wrong order / interleaving", body: `for (const s of ["ba", "abab", "aba", "bbaa", "abba"]) assertEqual(isAnBn(s), false, JSON.stringify(s));` },
      { name: "foreign symbols rejected", body: `assertEqual(isAnBn("aXbb"), false); assertEqual(isAnBn("aabbc"), false);` },
    ],
  },
  {
    id: "collatz-steps",
    chapterId: "ch20",
    title: "Collatz steps",
    difficulty: "intro",
    tags: ["computability", "halting"],
    prompt: `
Return how many steps the **Collatz** process takes to reach 1 from \`n\` (n ≥ 1). Each step: if \`n\` is even, halve it; if odd, do \`3n + 1\`.

Whether this *always* reaches 1 is an **open problem** — nobody has proved it halts for every n. But for any *specific* n we can simply run it and count (undecidability is about the general case, not each instance).

### Examples
- \`collatzSteps(1)\` → \`0\`
- \`collatzSteps(6)\` → \`8\` (6→3→10→5→16→8→4→2→1)
`,
    signature: `function collatzSteps(n: number): number`,
    exportName: "collatzSteps",
    starter: `function collatzSteps(n) {
  // TODO: count steps until n === 1 (even: n/2, odd: 3n+1).
  return 0;
}`,
    solution: `function collatzSteps(n) {
  let steps = 0;
  while (n !== 1) {
    n = n % 2 === 0 ? n / 2 : 3 * n + 1;
    steps++;
  }
  return steps;
}`,
    tests: [
      { name: "base case n=1 → 0", body: `assertEqual(collatzSteps(1), 0);` },
      { name: "small values", body: `assertEqual(collatzSteps(2), 1);
assertEqual(collatzSteps(3), 7);
assertEqual(collatzSteps(6), 8);` },
      { name: "the famous long one: 27 → 111", body: `assertEqual(collatzSteps(27), 111);` },
      { name: "powers of two take log2 steps", body: `assertEqual(collatzSteps(16), 4); assertEqual(collatzSteps(1024), 10);` },
    ],
  },
  // ========================================================================
  // ch21 · Complexity
  // ========================================================================
  {
    id: "subset-sum-decide",
    chapterId: "ch21",
    title: "Subset sum (decision)",
    difficulty: "core",
    tags: ["complexity", "NP", "dynamic-programming"],
    prompt: `
Decide whether **some subset** of \`nums\` (non-negative integers) sums to exactly \`target\`. Return \`true\`/\`false\`. The empty subset sums to 0.

Subset-sum is **NP-complete**, but this decision version has a clean pseudo-polynomial DP: track the set of **reachable sums**. Start with \`{0}\`; for each number \`x\`, add \`s + x\` for every reachable \`s\`. Then check whether \`target\` is reachable.

- Time: **O(n · S)** where S is the number of distinct reachable sums — polynomial in the *value* of the sums, exponential in their bit-length (why subset-sum stays NP-complete).
`,
    signature: `function subsetSum(nums: number[], target: number): boolean`,
    exportName: "subsetSum",
    starter: `function subsetSum(nums, target) {
  // TODO: grow the set of reachable subset sums, then test target.
  return false;
}`,
    solution: `function subsetSum(nums, target) {
  const reach = new Set([0]);
  for (const x of nums) {
    for (const s of [...reach]) reach.add(s + x);
  }
  return reach.has(target);
}`,
    tests: [
      { name: "empty subset makes 0", body: `assertEqual(subsetSum([], 0), true);
assertEqual(subsetSum([], 5), false);` },
      { name: "classic hits", body: `assertEqual(subsetSum([1, 2, 3], 5), true);
assertEqual(subsetSum([3, 34, 4, 12, 5, 2], 9), true);` },
      { name: "unreachable targets", body: `assertEqual(subsetSum([1, 2, 3], 7), false);
assertEqual(subsetSum([2, 4, 6], 7), false);` },
      { name: "whole-array sum and single elements", body: `assertEqual(subsetSum([5, 10, 15], 30), true);
assertEqual(subsetSum([5, 10, 15], 15), true);
assertEqual(subsetSum([5, 10, 15], 4), false);` },
    ],
  },
  {
    id: "verify-hamiltonian",
    chapterId: "ch21",
    title: "Verify a Hamiltonian cycle",
    difficulty: "core",
    tags: ["complexity", "NP", "graphs", "verification"],
    prompt: `
*Finding* a Hamiltonian cycle is NP-complete — but **verifying** a proposed one is easy, and that gap is the whole point of NP. Given \`n\` vertices \`0..n-1\`, an undirected \`edges\` list, and a candidate \`order\` (a sequence of vertices), return whether \`order\` is a valid **Hamiltonian cycle**: it visits **every** vertex exactly once and each consecutive pair — including last→first — is connected by an edge.

- Time: **O(n + E)** — polynomial. This is the "certificate check" that puts Hamiltonian-cycle in NP.
`,
    signature: `function isHamiltonianCycle(n: number, edges: [number, number][], order: number[]): boolean`,
    exportName: "isHamiltonianCycle",
    starter: `function isHamiltonianCycle(n, edges, order) {
  // TODO: check it's a permutation of all n vertices AND every consecutive pair (incl. wrap) is an edge.
  return true;
}`,
    solution: `function isHamiltonianCycle(n, edges, order) {
  if (order.length !== n) return false;
  const seen = new Set(order);
  if (seen.size !== n) return false;
  for (const v of order) if (v < 0 || v >= n) return false;
  const key = (a, b) => (a < b ? a + "," + b : b + "," + a);
  const has = new Set(edges.map(([a, b]) => key(a, b)));
  for (let i = 0; i < n; i++) {
    if (!has.has(key(order[i], order[(i + 1) % n]))) return false;
  }
  return true;
}`,
    tests: [
      { name: "square 4-cycle is valid", body: `const e = [[0, 1], [1, 2], [2, 3], [3, 0]];
assertEqual(isHamiltonianCycle(4, e, [0, 1, 2, 3]), true);` },
      { name: "non-edge in the tour", body: `const e = [[0, 1], [1, 2], [2, 3], [3, 0]];
assertEqual(isHamiltonianCycle(4, e, [0, 2, 1, 3]), false);` },
      { name: "wrong length / repeats", body: `const e = [[0, 1], [1, 2], [2, 3], [3, 0]];
assertEqual(isHamiltonianCycle(4, e, [0, 1, 2]), false);
assertEqual(isHamiltonianCycle(4, e, [0, 1, 1, 3]), false);` },
      { name: "triangle (K3) both directions", body: `const e = [[0, 1], [1, 2], [2, 0]];
assertEqual(isHamiltonianCycle(3, e, [0, 1, 2]), true);
assertEqual(isHamiltonianCycle(3, e, [0, 2, 1]), true);` },
    ],
  },
  // ======================================================================
  // ch22 · Processes & scheduling
  // ======================================================================
  {
    id: "sjf-average-wait",
    chapterId: "ch22",
    title: "SJF average waiting time",
    difficulty: "core",
    tags: ["os", "scheduling", "greedy"],
    prompt: `
All processes are ready at time 0 with the given CPU **burst** times. Return the **minimum possible average waiting time**, which **Shortest-Job-First** achieves.

Waiting time of a process = time it spends in the ready queue before it first runs (here, the sum of all bursts scheduled before it). Run the shortest bursts first to minimise the total.

- Return \`0\` for an empty list.

### Examples
- \`sjfAverageWait([6, 8, 7, 3])\` → \`7\`  (order 3, 6, 7, 8 → waits 0, 3, 9, 16)
- \`sjfAverageWait([3, 3, 3])\` → \`3\`
`,
    signature: `function sjfAverageWait(bursts: number[]): number`,
    exportName: "sjfAverageWait",
    starter: `function sjfAverageWait(bursts) {
  // TODO: schedule shortest-first; average the per-process waiting times.
  return 0;
}`,
    solution: `function sjfAverageWait(bursts) {
  if (bursts.length === 0) return 0;
  const sorted = [...bursts].sort((a, b) => a - b);
  let wait = 0;
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    total += wait;
    wait += sorted[i];
  }
  return total / sorted.length;
}`,
    tests: [
      { name: "classic four-job instance → 7", body: `assertEqual(sjfAverageWait([6, 8, 7, 3]), 7);` },
      { name: "equal bursts → 3", body: `assertEqual(sjfAverageWait([3, 3, 3]), 3);` },
      { name: "input order does not matter (it sorts)", body: `assertEqual(sjfAverageWait([8, 7, 6, 3]), 7);` },
      { name: "empty list → 0", body: `assertEqual(sjfAverageWait([]), 0);` },
      { name: "single process never waits → 0", body: `assertEqual(sjfAverageWait([42]), 0);` },
      { name: "fractional average is exact", body: `assert(Math.abs(sjfAverageWait([1, 2, 4]) - 4 / 3) < 1e-9, "want 4/3");` },
      {
        name: "SJF beats the reverse (longest-first) order",
        body: `const b = [2, 4, 6, 8];
// longest-first total waiting = 0 + 8 + 12 + 14 = 34 → avg 8.5; SJF must be less
assert(sjfAverageWait(b) < 8.5, "SJF should be strictly better than longest-first");
assertEqual(sjfAverageWait(b), 5);`,
      },
    ],
  },
  {
    id: "round-robin-order",
    chapterId: "ch22",
    title: "Round-robin dispatch order",
    difficulty: "core",
    tags: ["os", "scheduling", "queue"],
    prompt: `
Processes \`0 … n−1\` are all ready at time 0 with the given **burst** times. Simulate **round-robin** with the given time \`quantum\` and return the sequence of process **indices** in the order they receive the CPU — one entry per dispatched slice (a slice runs for \`min(quantum, remaining)\`).

Use a FIFO ready queue: dispatch the front process for one slice, and if it still has time left, re-enqueue it at the **back**.

### Examples
- \`roundRobinOrder([4, 2, 3], 2)\` → \`[0, 1, 2, 0, 2]\`
- \`roundRobinOrder([5], 2)\` → \`[0, 0, 0]\`
- \`roundRobinOrder([3, 3], 3)\` → \`[0, 1]\`
`,
    signature: `function roundRobinOrder(bursts: number[], quantum: number): number[]`,
    exportName: "roundRobinOrder",
    starter: `function roundRobinOrder(bursts, quantum) {
  // TODO: FIFO queue; dispatch a slice, re-enqueue if work remains.
  return [];
}`,
    solution: `function roundRobinOrder(bursts, quantum) {
  const remaining = bursts.map((b) => b);
  const queue = [];
  for (let i = 0; i < bursts.length; i++) if (remaining[i] > 0) queue.push(i);
  const order = [];
  while (queue.length > 0) {
    const i = queue.shift();
    order.push(i);
    remaining[i] -= Math.min(quantum, remaining[i]);
    if (remaining[i] > 0) queue.push(i);
  }
  return order;
}`,
    tests: [
      { name: "three processes, quantum 2", body: `assertDeepEqual(roundRobinOrder([4, 2, 3], 2), [0, 1, 2, 0, 2]);` },
      { name: "single long process is sliced", body: `assertDeepEqual(roundRobinOrder([5], 2), [0, 0, 0]);` },
      { name: "each fits in one quantum", body: `assertDeepEqual(roundRobinOrder([3, 3], 3), [0, 1]);` },
      { name: "empty input → empty order", body: `assertDeepEqual(roundRobinOrder([], 2), []);` },
      { name: "huge quantum degenerates to FCFS", body: `assertDeepEqual(roundRobinOrder([2, 5, 1], 100), [0, 1, 2]);` },
      {
        name: "index i appears ceil(burst/quantum) times",
        body: `const bursts = [4, 2, 3];
const q = 2;
const order = roundRobinOrder(bursts, q);
for (let i = 0; i < bursts.length; i++) {
  const count = order.filter((x) => x === i).length;
  assertEqual(count, Math.ceil(bursts[i] / q), "dispatches of P" + i);
}`,
      },
    ],
  },
  // ======================================================================
  // ch23 · Memory
  // ======================================================================
  {
    id: "page-table-translate",
    chapterId: "ch23",
    title: "Virtual → physical translation",
    difficulty: "core",
    tags: ["os", "memory", "paging", "bit-manipulation"],
    prompt: `
Translate a **virtual address** to a **physical address** through a single-level page table.

- \`pageSize\` is a power of two.
- \`pageTable[vpn]\` is the physical **frame** number for virtual page \`vpn\`, or \`-1\` if that page is **not present** (invalid).
- Split the address: \`offset = addr mod pageSize\`, \`vpn = ⌊addr / pageSize⌋\`.
- If \`vpn\` is out of range **or** the entry is \`-1\`, it's a **page fault** — return \`-1\`.
- Otherwise return \`frame × pageSize + offset\`.

### Examples
- \`translateAddress(16, [5, -1, 3], 2)\` → \`82\`  (vpn 0, frame 5 → 5·16+2)
- \`translateAddress(16, [5, -1, 3], 18)\` → \`-1\`  (vpn 1 is not present)
`,
    signature: `function translateAddress(pageSize: number, pageTable: number[], addr: number): number`,
    exportName: "translateAddress",
    starter: `function translateAddress(pageSize, pageTable, addr) {
  // TODO: split into vpn/offset, look up the frame, handle faults.
  return -1;
}`,
    solution: `function translateAddress(pageSize, pageTable, addr) {
  const offset = addr % pageSize;
  const vpn = Math.floor(addr / pageSize);
  if (vpn < 0 || vpn >= pageTable.length) return -1;
  const frame = pageTable[vpn];
  if (frame < 0) return -1;
  return frame * pageSize + offset;
}`,
    tests: [
      { name: "present page, low offset", body: `assertEqual(translateAddress(16, [5, -1, 3], 2), 82);` },
      { name: "present page, second entry via offset math", body: `assertEqual(translateAddress(16, [5, -1, 3], 33), 49);` },
      { name: "not-present page → fault", body: `assertEqual(translateAddress(16, [5, -1, 3], 18), -1);` },
      { name: "vpn beyond the table → fault", body: `assertEqual(translateAddress(16, [5, -1, 3], 100), -1);` },
      { name: "4 KiB page, offset preserved", body: `assertEqual(translateAddress(4096, [2], 100), 8292);` },
      {
        name: "offset never leaks into the frame",
        body: `// max offset stays within the page
assertEqual(translateAddress(16, [5], 15), 5 * 16 + 15);
assertEqual(translateAddress(16, [5], 16), -1); // vpn 1, out of range`,
      },
    ],
  },
  {
    id: "fifo-page-faults",
    chapterId: "ch23",
    title: "FIFO page faults",
    difficulty: "core",
    tags: ["os", "memory", "paging", "queue"],
    prompt: `
Count the **page faults** a reference string causes under **FIFO** replacement with \`frames\` physical frames.

A reference is a **fault** if the page isn't resident. On a fault: if a frame is free, load it there; otherwise evict the **oldest-loaded** page (first in, first out) and load the new one. A reference to a resident page is a hit (no fault).

### Examples
- \`fifoPageFaults([1, 2, 3, 1, 2, 4, 1, 2, 5], 3)\` → \`7\`
- \`fifoPageFaults([1, 2, 3], 3)\` → \`3\`  (all cold misses)

> Bonus intuition: try the string \`1 2 3 4 1 2 5 1 2 3 4 5\` with 3 vs 4 frames and watch FIFO fault **more** with more memory — Bélády's anomaly.
`,
    signature: `function fifoPageFaults(refs: number[], frames: number): number`,
    exportName: "fifoPageFaults",
    starter: `function fifoPageFaults(refs, frames) {
  // TODO: track the resident set + a FIFO queue of load order.
  return 0;
}`,
    solution: `function fifoPageFaults(refs, frames) {
  const resident = new Set();
  const queue = [];
  let faults = 0;
  for (const page of refs) {
    if (resident.has(page)) continue;
    faults++;
    if (resident.size >= frames) {
      const victim = queue.shift();
      resident.delete(victim);
    }
    resident.add(page);
    queue.push(page);
  }
  return faults;
}`,
    tests: [
      { name: "hot pages evicted by age → 7 faults", body: `assertEqual(fifoPageFaults([1, 2, 3, 1, 2, 4, 1, 2, 5], 3), 7);` },
      { name: "all distinct, enough frames → all cold misses", body: `assertEqual(fifoPageFaults([1, 2, 3], 3), 3);` },
      { name: "one page hammered → 1 fault", body: `assertEqual(fifoPageFaults([1, 1, 1, 1], 1), 1);` },
      { name: "empty string → 0 faults", body: `assertEqual(fifoPageFaults([], 3), 0);` },
      {
        name: "Bélády's anomaly: more frames, MORE faults",
        body: `const s = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
assertEqual(fifoPageFaults(s, 3), 9);
assertEqual(fifoPageFaults(s, 4), 10);
assert(fifoPageFaults(s, 4) > fifoPageFaults(s, 3), "the anomaly");`,
      },
    ],
  },

  // ========================================================================
  // ch24 · Files & storage
  // ========================================================================
  {
    id: "inode-max-size",
    chapterId: "ch24",
    title: "Maximum file size of an inode",
    difficulty: "core",
    tags: ["os", "files", "inode"],
    prompt: `
A classic Unix **inode** holds \`nDirect\` direct block pointers, plus one **single-**, one **double-**, and one **triple-indirect** pointer. Each block holds \`k = ⌊blockSize / pointerSize⌋\` pointers.

Return the **largest file** (in bytes) the inode can address:

\`\`\`
max = (nDirect + k + k² + k³) · blockSize
\`\`\`

### Examples
- \`inodeMaxSize(4096, 4, 12)\` → \`(12 + 1024 + 1024² + 1024³) · 4096\`  (just over 4 TiB)
- \`inodeMaxSize(8, 4, 2)\` → \`128\`  (k = 2 → (2 + 2 + 4 + 8) · 8)
`,
    signature: `function inodeMaxSize(blockSize: number, pointerSize: number, nDirect: number): number`,
    exportName: "inodeMaxSize",
    starter: `function inodeMaxSize(blockSize, pointerSize, nDirect) {
  // TODO: k = pointers per block; sum direct + single + double + triple, times blockSize.
  return 0;
}`,
    solution: `function inodeMaxSize(blockSize, pointerSize, nDirect) {
  const k = Math.floor(blockSize / pointerSize);
  const blocks = nDirect + k + k * k + k * k * k;
  return blocks * blockSize;
}`,
    tests: [
      { name: "tiny config, k = 2 → 128", body: `assertEqual(inodeMaxSize(8, 4, 2), 128);` },
      { name: "single-level fan-out counts once", body: `assertEqual(inodeMaxSize(16, 4, 1), (1 + 4 + 16 + 64) * 16);` },
      { name: "classic 4 KiB / 4 B / 12 direct", body: `assertEqual(inodeMaxSize(4096, 4, 12), (12 + 1024 + 1024 * 1024 + 1024 * 1024 * 1024) * 4096);` },
      { name: "triple-indirect dominates → over 4 TiB", body: `assert(inodeMaxSize(4096, 4, 12) > 4 * Math.pow(2, 40), "should exceed 4 TiB");` },
      { name: "bigger pointers → smaller fan-out → smaller max", body: `assert(inodeMaxSize(4096, 8, 12) < inodeMaxSize(4096, 4, 12), "8-byte pointers halve k");` },
    ],
  },
  {
    id: "first-fit-alloc",
    chapterId: "ch24",
    title: "First-fit contiguous allocation",
    difficulty: "core",
    tags: ["os", "files", "allocation"],
    prompt: `
For **contiguous** allocation you need one run of adjacent free blocks. Given \`free\` (an array where \`1\` = free, \`0\` = used) and a \`length\`, return the **start index** of the first run of \`length\` consecutive free blocks, or \`-1\` if none exists.

- Return \`-1\` for \`length <= 0\`.

### Examples
- \`firstFit([1,1,0,1,1,1,0], 3)\` → \`3\`
- \`firstFit([1,1,0,1,1,1,0], 2)\` → \`0\`
- \`firstFit([1,1,0,1,1,1,0], 4)\` → \`-1\`  (external fragmentation — no hole big enough)
`,
    signature: `function firstFit(free: number[], length: number): number`,
    exportName: "firstFit",
    starter: `function firstFit(free, length) {
  // TODO: scan for the first run of \`length\` consecutive 1s; return its start, else -1.
  return 0;
}`,
    solution: `function firstFit(free, length) {
  if (length <= 0) return -1;
  let run = 0;
  for (let i = 0; i < free.length; i++) {
    if (free[i] === 1) {
      run++;
      if (run === length) return i - length + 1;
    } else {
      run = 0;
    }
  }
  return -1;
}`,
    tests: [
      { name: "first hole of size 3", body: `assertEqual(firstFit([1, 1, 0, 1, 1, 1, 0], 3), 3);` },
      { name: "earliest fit wins", body: `assertEqual(firstFit([1, 1, 0, 1, 1, 1, 0], 2), 0);` },
      { name: "no hole big enough → -1", body: `assertEqual(firstFit([1, 1, 0, 1, 1, 1, 0], 4), -1);` },
      { name: "full disk → -1", body: `assertEqual(firstFit([0, 0, 0], 1), -1);` },
      { name: "whole disk is one run", body: `assertEqual(firstFit([1, 1, 1, 1], 4), 0);` },
      { name: "length 0 is invalid → -1", body: `assertEqual(firstFit([1, 1, 1], 0), -1);` },
    ],
  },

  // ========================================================================
  // ch25 · Concurrency
  // ========================================================================
  {
    id: "lock-order",
    chapterId: "ch25",
    title: "Deadlock-free lock ordering",
    difficulty: "intro",
    tags: ["os", "concurrency", "deadlock"],
    prompt: `
The simplest way to prevent the **circular wait** condition is to acquire locks in a fixed **global order**. Given a list of lock ids a thread needs, return them in the order it should acquire them: **ascending by id**.

- Don't mutate the input; return a new sorted array.
- Return \`[]\` for an empty list.

### Examples
- \`safeOrder([3, 1, 2])\` → \`[1, 2, 3]\`
- \`safeOrder([5])\` → \`[5]\`

If **every** thread acquires locks in this order, no cycle in the wait-for graph can ever form.
`,
    signature: `function safeOrder(ids: number[]): number[]`,
    exportName: "safeOrder",
    starter: `function safeOrder(ids) {
  // TODO: return a new array of ids sorted ascending (a consistent global lock order).
  return ids;
}`,
    solution: `function safeOrder(ids) {
  return [...ids].sort((a, b) => a - b);
}`,
    tests: [
      { name: "sorts ascending", body: `assertDeepEqual(safeOrder([3, 1, 2]), [1, 2, 3]);` },
      { name: "already ordered is unchanged", body: `assertDeepEqual(safeOrder([1, 2, 3]), [1, 2, 3]);` },
      { name: "single lock", body: `assertDeepEqual(safeOrder([5]), [5]);` },
      { name: "empty list", body: `assertDeepEqual(safeOrder([]), []);` },
      { name: "does not mutate the input", body: `const a = [2, 1]; safeOrder(a); assertDeepEqual(a, [2, 1]);` },
    ],
  },
  {
    id: "wait-for-cycle",
    chapterId: "ch25",
    title: "Detect deadlock: a cycle in the wait-for graph",
    difficulty: "core",
    tags: ["os", "concurrency", "deadlock", "graphs"],
    prompt: `
An OS detects deadlock by finding a **cycle in the wait-for graph**. Here each thread waits on at most one other, so the graph is given as \`waitsFor\`, where \`waitsFor[i]\` is the thread \`i\` is blocked on, or \`-1\` if \`i\` isn't waiting.

Return \`true\` if the graph contains a **cycle** (a deadlock), else \`false\`.

### Examples
- \`hasCycle([1, 0])\` → \`true\`  (0 → 1 → 0)
- \`hasCycle([1, 2, 0])\` → \`true\`  (0 → 1 → 2 → 0)
- \`hasCycle([1, 2, -1])\` → \`false\`  (0 → 1 → 2 → stop)
`,
    signature: `function hasCycle(waitsFor: number[]): boolean`,
    exportName: "hasCycle",
    starter: `function hasCycle(waitsFor) {
  // TODO: from each node, follow waits-for pointers; a walk that never hits -1 is a cycle.
  return false;
}`,
    solution: `function hasCycle(waitsFor) {
  const n = waitsFor.length;
  for (let i = 0; i < n; i++) {
    let cur = i;
    let steps = 0;
    while (cur !== -1 && steps <= n) {
      cur = waitsFor[cur];
      steps++;
    }
    if (cur !== -1) return true; // walked past n nodes without stopping ⇒ cycle
  }
  return false;
}`,
    tests: [
      { name: "two-cycle", body: `assertEqual(hasCycle([1, 0]), true);` },
      { name: "three-cycle", body: `assertEqual(hasCycle([1, 2, 0]), true);` },
      { name: "a chain that terminates is not a cycle", body: `assertEqual(hasCycle([1, 2, -1]), false);` },
      { name: "nobody waiting", body: `assertEqual(hasCycle([-1, -1, -1]), false);` },
      { name: "self-loop is a cycle", body: `assertEqual(hasCycle([0]), true);` },
      { name: "tail leading into a cycle still counts", body: `assertEqual(hasCycle([1, 2, 3, 1]), true);` },
    ],
  },
  // ========================================================================
  // ch26 · How networks work
  // ========================================================================
  {
    id: "ip-same-subnet",
    chapterId: "ch26",
    title: "Same subnet?",
    difficulty: "core",
    tags: ["networks", "bitwise", "subnet"],
    prompt: `
Two IPv4 addresses are on the **same subnet** if their network **prefixes** match. Given two dotted-quad strings and a **prefix length** (0–32), return whether they share a subnet.

Build the 32-bit mask (the top \`prefix\` bits set), AND each address with it, and compare. Watch the sign bit: use \`>>> 0\` to stay unsigned.

### Examples
- \`sameSubnet("192.168.1.10", "192.168.1.99", 24)\` → \`true\`
- \`sameSubnet("192.168.1.10", "192.168.2.10", 24)\` → \`false\`
- \`sameSubnet("1.2.3.4", "5.6.7.8", 0)\` → \`true\` (a /0 is the whole internet)
`,
    signature: `function sameSubnet(a: string, b: string, prefix: number): boolean`,
    exportName: "sameSubnet",
    starter: `function sameSubnet(a, b, prefix) {
  // TODO: turn each address into a 32-bit int, mask off the host bits, compare.
  return false;
}`,
    solution: `function sameSubnet(a, b, prefix) {
  const toInt = (ip) => ip.split(".").reduce((acc, o) => acc * 256 + Number(o), 0);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ((toInt(a) & mask) >>> 0) === ((toInt(b) & mask) >>> 0);
}`,
    tests: [
      { name: "same /24", body: `assertEqual(sameSubnet("192.168.1.10", "192.168.1.99", 24), true);` },
      { name: "different /24", body: `assertEqual(sameSubnet("192.168.1.10", "192.168.2.10", 24), false);` },
      { name: "same /16", body: `assertEqual(sameSubnet("10.0.0.1", "10.0.5.1", 16), true);` },
      { name: "different /8", body: `assertEqual(sameSubnet("10.0.0.1", "11.0.0.1", 8), false);` },
      { name: "/0 matches everything", body: `assertEqual(sameSubnet("1.2.3.4", "5.6.7.8", 0), true);` },
      { name: "/32 is a single host", body: `assertEqual(sameSubnet("10.0.0.1", "10.0.0.2", 32), false);` },
    ],
  },
  {
    id: "switch-learn",
    chapterId: "ch26",
    title: "Switch MAC learning",
    difficulty: "intro",
    tags: ["networks", "hash-map", "simulation"],
    prompt: `
A learning switch records which port each **source** MAC arrived on. Given a list of frames \`{ src, dst, inPort }\`, return the final **MAC table** as an object mapping \`mac → port\`.

Only the **source** and **inPort** matter for learning (the destination is about *forwarding*, not learning). If a host later appears on a new port, the table updates to the latest.

### Examples
- \`learnedTable([{src:"A",dst:"B",inPort:0}])\` → \`{ A: 0 }\`
- \`learnedTable([{src:"A",dst:"B",inPort:0},{src:"B",dst:"A",inPort:1}])\` → \`{ A: 0, B: 1 }\`
`,
    signature: `function learnedTable(frames: { src: string; dst: string; inPort: number }[]): Record<string, number>`,
    exportName: "learnedTable",
    starter: `function learnedTable(frames) {
  // TODO: record src -> inPort for every frame; last write wins.
  return {};
}`,
    solution: `function learnedTable(frames) {
  const table = {};
  for (const f of frames) table[f.src] = f.inPort;
  return table;
}`,
    tests: [
      { name: "learns one host", body: `assertDeepEqual(learnedTable([{ src: "A", dst: "B", inPort: 0 }]), { A: 0 });` },
      { name: "learns two hosts", body: `assertDeepEqual(learnedTable([{ src: "A", dst: "B", inPort: 0 }, { src: "B", dst: "A", inPort: 1 }]), { A: 0, B: 1 });` },
      { name: "a moved host updates its port", body: `assertDeepEqual(learnedTable([{ src: "A", dst: "B", inPort: 0 }, { src: "A", dst: "C", inPort: 2 }]), { A: 2 });` },
      { name: "empty input, empty table", body: `assertDeepEqual(learnedTable([]), {});` },
    ],
  },
  // ========================================================================
  // ch27 · TCP & UDP
  // ========================================================================
  {
    id: "handshake-acks",
    chapterId: "ch27",
    title: "Handshake numbers",
    difficulty: "intro",
    tags: ["networks", "tcp"],
    prompt: `
In the TCP three-way handshake a **SYN consumes one sequence number**. Given the client and server initial sequence numbers, return the three key values:

- \`synAckAck\` — the ack in the server's SYN-ACK (acknowledges the client's SYN),
- \`finalAck\` — the ack in the client's closing ACK (acknowledges the server's SYN),
- \`finalSeq\` — the client's own sequence number on that final segment.

### Example
- \`handshake(1000, 5000)\` → \`{ synAckAck: 1001, finalAck: 5001, finalSeq: 1001 }\`
`,
    signature: `function handshake(clientISN: number, serverISN: number): { synAckAck: number; finalAck: number; finalSeq: number }`,
    exportName: "handshake",
    starter: `function handshake(clientISN, serverISN) {
  // TODO: remember that a SYN consumes one sequence number.
  return { synAckAck: 0, finalAck: 0, finalSeq: 0 };
}`,
    solution: `function handshake(clientISN, serverISN) {
  return { synAckAck: clientISN + 1, finalAck: serverISN + 1, finalSeq: clientISN + 1 };
}`,
    tests: [
      { name: "the worked example", body: `assertDeepEqual(handshake(1000, 5000), { synAckAck: 1001, finalAck: 5001, finalSeq: 1001 });` },
      { name: "zero ISNs still shift by one", body: `assertDeepEqual(handshake(0, 0), { synAckAck: 1, finalAck: 1, finalSeq: 1 });` },
      { name: "un-round numbers", body: `assertDeepEqual(handshake(4200, 9100), { synAckAck: 4201, finalAck: 9101, finalSeq: 4201 });` },
    ],
  },
  {
    id: "reno-cwnd",
    chapterId: "ch27",
    title: "Reno congestion window",
    difficulty: "core",
    tags: ["networks", "tcp", "congestion"],
    prompt: `
Simulate TCP Reno's congestion window. Start \`cwnd = 1\` in **slow start**. Apply each event in order:

- \`"ack"\` in slow start (\`cwnd < ssthresh\`): \`cwnd *= 2\`; if it reaches \`ssthresh\`, clamp to \`ssthresh\` and switch to congestion avoidance.
- \`"ack"\` in congestion avoidance: \`cwnd += 1\`.
- \`"loss"\` (triple-dup ACK): \`ssthresh = floor(cwnd/2)\`, \`cwnd = ssthresh\`, congestion avoidance.
- \`"timeout"\`: \`ssthresh = floor(cwnd/2)\`, \`cwnd = 1\`, back to slow start.

Return the final \`cwnd\`.

### Examples
- \`finalCwnd(16, ["ack","ack","ack","ack"])\` → \`16\` (1→2→4→8→16)
- \`finalCwnd(16, ["ack","ack","ack","ack","loss"])\` → \`8\`
`,
    signature: `function finalCwnd(ssthresh: number, events: string[]): number`,
    exportName: "finalCwnd",
    starter: `function finalCwnd(ssthresh, events) {
  // TODO: track cwnd + phase (slow-start vs congestion-avoidance) across events.
  return 1;
}`,
    solution: `function finalCwnd(ssthresh, events) {
  let cwnd = 1;
  let thresh = ssthresh;
  let slowStart = true;
  for (const e of events) {
    if (e === "timeout") {
      thresh = Math.max(1, Math.floor(cwnd / 2));
      cwnd = 1;
      slowStart = true;
    } else if (e === "loss") {
      thresh = Math.max(1, Math.floor(cwnd / 2));
      cwnd = thresh;
      slowStart = false;
    } else {
      if (slowStart) {
        cwnd *= 2;
        if (cwnd >= thresh) {
          cwnd = thresh;
          slowStart = false;
        }
      } else {
        cwnd += 1;
      }
    }
  }
  return cwnd;
}`,
    tests: [
      { name: "slow start doubles to the threshold", body: `assertEqual(finalCwnd(16, ["ack", "ack", "ack", "ack"]), 16);` },
      { name: "then congestion avoidance adds one", body: `assertEqual(finalCwnd(16, ["ack", "ack", "ack", "ack", "ack"]), 17);` },
      { name: "triple-dup loss halves", body: `assertEqual(finalCwnd(16, ["ack", "ack", "ack", "ack", "loss"]), 8);` },
      { name: "timeout collapses to 1", body: `assertEqual(finalCwnd(16, ["ack", "ack", "ack", "ack", "timeout"]), 1);` },
      { name: "one ack from a cold start", body: `assertEqual(finalCwnd(8, ["ack"]), 2);` },
    ],
  },
  // ========================================================================
  // ch28 · The Web
  // ========================================================================
  {
    id: "parse-url",
    chapterId: "ch28",
    title: "Parse a URL",
    difficulty: "core",
    tags: ["strings", "parsing", "web"],
    prompt: `
Split an \`http\`/\`https\` URL into its parts: \`{ protocol, host, port, path }\`. Assume no query string or fragment.

- If no explicit port, default to **443** for https and **80** for http.
- If no path, default to \`"/"\`.

### Examples
- \`parseUrl("https://example.com/")\` → \`{ protocol:"https", host:"example.com", port:443, path:"/" }\`
- \`parseUrl("http://example.com:8080/a/b")\` → \`{ protocol:"http", host:"example.com", port:8080, path:"/a/b" }\`
`,
    signature: `function parseUrl(url: string): { protocol: string; host: string; port: number; path: string }`,
    exportName: "parseUrl",
    starter: `function parseUrl(url) {
  // TODO: split protocol://authority/path, then default the port + path.
  return { protocol: "", host: "", port: 0, path: "/" };
}`,
    solution: `function parseUrl(url) {
  const [protocol, rest] = url.split("://");
  const slash = rest.indexOf("/");
  const authority = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? "/" : rest.slice(slash);
  const colon = authority.indexOf(":");
  let host = authority;
  let port;
  if (colon !== -1) {
    host = authority.slice(0, colon);
    port = Number(authority.slice(colon + 1));
  } else {
    port = protocol === "https" ? 443 : 80;
  }
  return { protocol, host, port, path };
}`,
    tests: [
      { name: "https defaults to 443 and root path", body: `assertDeepEqual(parseUrl("https://example.com/"), { protocol: "https", host: "example.com", port: 443, path: "/" });` },
      { name: "http defaults to 80 with a path", body: `assertDeepEqual(parseUrl("http://example.com/a/b"), { protocol: "http", host: "example.com", port: 80, path: "/a/b" });` },
      { name: "explicit port wins", body: `assertDeepEqual(parseUrl("http://example.com:8080/a/b"), { protocol: "http", host: "example.com", port: 8080, path: "/a/b" });` },
      { name: "no path defaults to /", body: `assertDeepEqual(parseUrl("https://example.com"), { protocol: "https", host: "example.com", port: 443, path: "/" });` },
      { name: "https with explicit port and deep path", body: `assertDeepEqual(parseUrl("https://api.example.com:9443/v1/users"), { protocol: "https", host: "api.example.com", port: 9443, path: "/v1/users" });` },
    ],
  },
  {
    id: "cache-decision",
    chapterId: "ch28",
    title: "Cache freshness",
    difficulty: "intro",
    tags: ["web", "caching", "logic"],
    prompt: `
Given a cached response's policy \`{ maxAge, etag, noStore }\` and the seconds since it was stored, decide the outcome of a re-request: \`"hit"\`, \`"revalidate"\`, or \`"miss"\`.

Precedence (first match wins):
1. \`noStore\` → \`"miss"\` (never cached).
2. \`ageSec < maxAge\` → \`"hit"\` (fresh, served from cache).
3. stale **and** \`etag\` → \`"revalidate"\` (conditional GET → 304).
4. otherwise → \`"miss"\` (full refetch).

### Examples
- \`cacheOutcome({maxAge:3600,etag:true,noStore:false}, 100)\` → \`"hit"\`
- \`cacheOutcome({maxAge:60,etag:true,noStore:false}, 120)\` → \`"revalidate"\`
`,
    signature: `function cacheOutcome(policy: { maxAge: number; etag: boolean; noStore: boolean }, ageSec: number): string`,
    exportName: "cacheOutcome",
    starter: `function cacheOutcome(policy, ageSec) {
  // TODO: apply the four precedence rules in order.
  return "miss";
}`,
    solution: `function cacheOutcome(policy, ageSec) {
  if (policy.noStore) return "miss";
  if (ageSec < policy.maxAge) return "hit";
  if (policy.etag) return "revalidate";
  return "miss";
}`,
    tests: [
      { name: "fresh within max-age is a hit", body: `assertEqual(cacheOutcome({ maxAge: 3600, etag: true, noStore: false }, 100), "hit");` },
      { name: "stale with an ETag revalidates", body: `assertEqual(cacheOutcome({ maxAge: 60, etag: true, noStore: false }, 120), "revalidate");` },
      { name: "stale without a validator misses", body: `assertEqual(cacheOutcome({ maxAge: 60, etag: false, noStore: false }, 120), "miss");` },
      { name: "no-store always misses", body: `assertEqual(cacheOutcome({ maxAge: 3600, etag: true, noStore: true }, 1), "miss");` },
      { name: "age exactly at max-age is stale", body: `assertEqual(cacheOutcome({ maxAge: 60, etag: true, noStore: false }, 60), "revalidate");` },
    ],
  },
  // ========================================================================
  // ch29 · Databases
  // ========================================================================
  {
    id: "index-range-scan",
    chapterId: "ch29",
    title: "Index range scan",
    difficulty: "core",
    tags: ["databases", "b-tree", "search"],
    prompt: `
A B+-tree index keeps its keys **sorted**. A range query \`WHERE k BETWEEN lo AND hi\` never scans the whole table — it binary-searches the first key \`≥ lo\`, then **walks the leaf chain** forward until a key passes \`hi\`.

Given a sorted ascending array \`keys\` and inclusive bounds \`lo\`/\`hi\`, return the keys in \`[lo, hi]\`, in order. Find the start with a **binary search** (O(log n)), not a linear scan.

- Time: **O(log n + m)** for \`m\` matches. Space: **O(m)**.

### Examples
- \`indexRangeScan([1,4,7,9,12,15], 4, 12)\` → \`[4, 7, 9, 12]\`
- \`indexRangeScan([1,4,7,9,12,15], 5, 6)\` → \`[]\`
`,
    signature: `function indexRangeScan(keys: number[], lo: number, hi: number): number[]`,
    exportName: "indexRangeScan",
    starter: `function indexRangeScan(keys, lo, hi) {
  // TODO: binary-search the first key >= lo, then walk while key <= hi.
  return [];
}`,
    solution: `function indexRangeScan(keys, lo, hi) {
  let loIdx = 0;
  let hiIdx = keys.length; // lower bound: first i with keys[i] >= lo
  while (loIdx < hiIdx) {
    const mid = (loIdx + hiIdx) >> 1;
    if (keys[mid] < lo) loIdx = mid + 1;
    else hiIdx = mid;
  }
  const out = [];
  for (let i = loIdx; i < keys.length && keys[i] <= hi; i++) out.push(keys[i]);
  return out;
}`,
    tests: [
      { name: "returns the inclusive range", body: `assertDeepEqual(indexRangeScan([1,4,7,9,12,15], 4, 12), [4,7,9,12]);` },
      { name: "empty when nothing matches", body: `assertDeepEqual(indexRangeScan([1,4,7,9,12,15], 5, 6), []);` },
      { name: "bounds outside the data grab everything", body: `assertDeepEqual(indexRangeScan([1,4,7,9], -5, 100), [1,4,7,9]);` },
      { name: "single-point range", body: `assertDeepEqual(indexRangeScan([1,4,7,9], 7, 7), [7]);` },
      { name: "handles the empty index", body: `assertDeepEqual(indexRangeScan([], 0, 10), []);` },
      { name: "lo below first, hi mid-array", body: `assertDeepEqual(indexRangeScan([10,20,30,40], 5, 25), [10,20]);` },
    ],
  },
  {
    id: "hash-join",
    chapterId: "ch29",
    title: "Hash join",
    difficulty: "core",
    tags: ["databases", "joins", "hashing"],
    prompt: `
Join two tables on equal \`key\` in **O(n + m)** instead of the O(n·m) nested loop. Build a hash map from the inner rows \`S\` (key → list of ids), then probe it once per outer row \`R\`.

Return the matched pairs as \`[R.id, S.id]\`, ordered by the outer rows, and within one outer row by the inner rows' original order.

- Time: **O(n + m)**. Space: **O(m)**.

### Examples
- R = \`[{id:1,key:20},{id:2,key:30}]\`, S = \`[{id:9,key:30},{id:8,key:20},{id:7,key:20}]\` → \`[[1,8],[1,7],[2,9]]\`
`,
    signature: `function hashJoin(R: { id: number; key: number }[], S: { id: number; key: number }[]): [number, number][]`,
    exportName: "hashJoin",
    starter: `function hashJoin(R, S) {
  // TODO: build a Map from S (key -> ids), then probe once per R row.
  return [];
}`,
    solution: `function hashJoin(R, S) {
  const table = new Map();
  for (const s of S) {
    if (table.has(s.key)) table.get(s.key).push(s.id);
    else table.set(s.key, [s.id]);
  }
  const out = [];
  for (const r of R) {
    const bucket = table.get(r.key);
    if (bucket) for (const sid of bucket) out.push([r.id, sid]);
  }
  return out;
}`,
    tests: [
      { name: "joins on equal keys, outer-then-inner order", body: `assertDeepEqual(hashJoin([{id:1,key:20},{id:2,key:30}], [{id:9,key:30},{id:8,key:20},{id:7,key:20}]), [[1,8],[1,7],[2,9]]);` },
      { name: "no matches → empty", body: `assertDeepEqual(hashJoin([{id:1,key:1}], [{id:2,key:2}]), []);` },
      { name: "many-to-many produces the cross product", body: `assertDeepEqual(hashJoin([{id:1,key:5},{id:2,key:5}], [{id:3,key:5},{id:4,key:5}]), [[1,3],[1,4],[2,3],[2,4]]);` },
      { name: "empty inner table", body: `assertDeepEqual(hashJoin([{id:1,key:1}], []), []);` },
      { name: "linear work on a large input", body: `const R=[],S=[]; for(let i=0;i<500;i++){R.push({id:i,key:i}); S.push({id:1000+i,key:i});} const res=hashJoin(R,S); assertEqual(res.length, 500); assertDeepEqual(res[0], [0,1000]); assertDeepEqual(res[499], [499,1499]);` },
    ],
  },
  // ========================================================================
  // ch30 · Distributed systems
  // ========================================================================
  {
    id: "quorum-majority",
    chapterId: "ch30",
    title: "Which partition can elect?",
    difficulty: "core",
    tags: ["distributed", "consensus", "quorum"],
    prompt: `
A cluster of \`n\` nodes splits into partitions of the given \`sizes\`. A partition can elect a leader only if it holds a **strict majority** of the whole cluster — a quorum of \`⌊n/2⌋ + 1\` nodes. Because two majorities must overlap, at most one partition can ever qualify: this is what prevents split-brain.

Return the **index** of the partition that can elect a leader, or \`-1\` if none can.

### Examples
- \`electableGroup(5, [3, 2])\` → \`0\`
- \`electableGroup(4, [2, 2])\` → \`-1\`  (a tie is not a majority)
`,
    signature: `function electableGroup(n: number, sizes: number[]): number`,
    exportName: "electableGroup",
    starter: `function electableGroup(n, sizes) {
  // TODO: a partition wins iff its size >= floor(n/2)+1.
  return -1;
}`,
    solution: `function electableGroup(n, sizes) {
  const quorum = Math.floor(n / 2) + 1;
  for (let i = 0; i < sizes.length; i++) if (sizes[i] >= quorum) return i;
  return -1;
}`,
    tests: [
      { name: "the majority side wins", body: `assertEqual(electableGroup(5, [3,2]), 0);` },
      { name: "an even split elects nobody", body: `assertEqual(electableGroup(4, [2,2]), -1);` },
      { name: "three-way split, none reaches quorum", body: `assertEqual(electableGroup(7, [3,3,1]), -1);` },
      { name: "returns the big partition, not the first", body: `assertEqual(electableGroup(7, [2,4,1]), 1);` },
      { name: "the whole cluster together", body: `assertEqual(electableGroup(3, [3]), 0);` },
      { name: "all singletons of a 5-cluster → nobody", body: `assertEqual(electableGroup(5, [1,1,1,1,1]), -1);` },
    ],
  },
  {
    id: "lamport-clock",
    chapterId: "ch30",
    title: "Lamport clock",
    difficulty: "core",
    tags: ["distributed", "clocks", "causality"],
    prompt: `
Track one process's **Lamport logical clock**. Start at 0 and process a list of events in order:
- \`{type:"local"}\` or \`{type:"send"}\` → increment the clock by 1.
- \`{type:"recv", ts}\` → set the clock to \`max(clock, ts) + 1\`.

Return the clock value **after each event**.

### Examples
- \`lamportClock([{type:"local"},{type:"send"},{type:"recv",ts:5}])\` → \`[1, 2, 6]\`
`,
    signature: `function lamportClock(events: { type: "local" | "send" | "recv"; ts?: number }[]): number[]`,
    exportName: "lamportClock",
    starter: `function lamportClock(events) {
  // TODO: local/send bump by 1; recv jumps to max(clock, ts)+1.
  return [];
}`,
    solution: `function lamportClock(events) {
  let c = 0;
  const out = [];
  for (const e of events) {
    if (e.type === "recv") c = Math.max(c, e.ts) + 1;
    else c = c + 1;
    out.push(c);
  }
  return out;
}`,
    tests: [
      { name: "local and send each increment", body: `assertDeepEqual(lamportClock([{type:"local"},{type:"send"}]), [1,2]);` },
      { name: "recv jumps to max(clock, ts)+1", body: `assertDeepEqual(lamportClock([{type:"local"},{type:"send"},{type:"recv",ts:5}]), [1,2,6]);` },
      { name: "a recv from the past still advances by 1", body: `assertDeepEqual(lamportClock([{type:"local"},{type:"local"},{type:"recv",ts:1}]), [1,2,3]);` },
      { name: "the empty stream", body: `assertDeepEqual(lamportClock([]), []);` },
      { name: "a chain of receives", body: `assertDeepEqual(lamportClock([{type:"recv",ts:10},{type:"recv",ts:3},{type:"send"}]), [11,12,13]);` },
    ],
  },
  // ========================================================================
  // ch.31 · Cryptography
  // ========================================================================
  {
    id: "caesar-decrypt",
    chapterId: "ch31",
    title: "Break the Caesar shift",
    difficulty: "core",
    tags: ["crypto", "ciphers", "strings"],
    prompt: `
Decrypt a **Caesar cipher**: shift every letter *back* by \`shift\` positions (wrapping around the alphabet), preserving case and leaving non-letters (spaces, punctuation) untouched.

### Examples
- \`caesarDecrypt("Khoor", 3)\` → \`"Hello"\`
- \`caesarDecrypt("Bcd, xyz!", 1)\` → \`"Abc, wxy!"\`
- \`caesarDecrypt("A", 1)\` → \`"Z"\`  (wraps)
`,
    signature: `function caesarDecrypt(text: string, shift: number): string`,
    exportName: "caesarDecrypt",
    starter: `function caesarDecrypt(text, shift) {
  // TODO: shift each letter back by \`shift\` (mod 26); keep case; leave other chars.
  return text;
}`,
    solution: `function caesarDecrypt(text, shift) {
  const s = ((shift % 26) + 26) % 26;
  let out = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + 26 - s) % 26) + 65);
    else if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + 26 - s) % 26) + 97);
    else out += ch;
  }
  return out;
}`,
    tests: [
      { name: "basic decrypt", body: `assertEqual(caesarDecrypt("Khoor", 3), "Hello");` },
      { name: "preserves punctuation and spaces", body: `assertEqual(caesarDecrypt("Bcd, xyz!", 1), "Abc, wxy!");` },
      { name: "wraps A back to Z", body: `assertEqual(caesarDecrypt("A", 1), "Z");` },
      { name: "shift 0 is identity", body: `assertEqual(caesarDecrypt("Hello, World!", 0), "Hello, World!");` },
      { name: "shift ≥ 26 is taken mod 26", body: `assertEqual(caesarDecrypt("Khoor", 29), "Hello");` },
      { name: "round-trips a sentence", body: `assertEqual(caesarDecrypt("Wkh txlfn eurzq ira", 3), "The quick brown fox");` },
    ],
  },
  {
    id: "mod-exp",
    chapterId: "ch31",
    title: "Modular exponentiation",
    difficulty: "core",
    tags: ["crypto", "math", "diffie-hellman"],
    prompt: `
Compute \`base^exp mod m\` — the core operation of Diffie–Hellman and RSA. The catch: \`base^exp\` is astronomically large, so you **cannot** compute it then take the remainder (\`Math.pow(3, 100000)\` is \`Infinity\`). Use **square-and-multiply**: reduce mod \`m\` at every step so the numbers stay small.

### Examples
- \`modExp(5, 6, 23)\` → \`8\`
- \`modExp(2, 10, 1000)\` → \`24\`  (1024 mod 1000)
- \`modExp(3, 100000, 19)\` → \`16\`  (never overflows)
`,
    signature: `function modExp(base: number, exp: number, mod: number): number`,
    exportName: "modExp",
    starter: `function modExp(base, exp, mod) {
  // TODO: square-and-multiply, reducing mod \`mod\` each step so nothing overflows.
  return 0;
}`,
    solution: `function modExp(base, exp, mod) {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}`,
    tests: [
      { name: "5^6 mod 23 = 8", body: `assertEqual(modExp(5, 6, 23), 8);` },
      { name: "5^15 mod 23 = 19", body: `assertEqual(modExp(5, 15, 23), 19);` },
      { name: "2^10 mod 1000 = 24", body: `assertEqual(modExp(2, 10, 1000), 24);` },
      { name: "anything^0 = 1", body: `assertEqual(modExp(7, 0, 13), 1);` },
      { name: "7^256 mod 13 = 9", body: `assertEqual(modExp(7, 256, 13), 9);` },
      { name: "huge exponent never overflows (naive Math.pow can't)", body: `assertEqual(modExp(3, 100000, 19), 16);` },
    ],
  },
  // ========================================================================
  // ch.32 · Security
  // ========================================================================
  {
    id: "html-escape",
    chapterId: "ch32",
    title: "Neutralize an XSS payload",
    difficulty: "core",
    tags: ["security", "xss", "strings"],
    prompt: `
Output-encode a string so it's safe to drop into HTML: replace the five metacharacters with their entities — \`&\`→\`&amp;\`, \`<\`→\`&lt;\`, \`>\`→\`&gt;\`, \`"\`→\`&quot;\`, \`'\`→\`&#39;\`. **Escape \`&\` first**, or you'll double-encode the entities you just produced.

### Examples
- \`escapeHtml("<script>")\` → \`"&lt;script&gt;"\`
- \`escapeHtml("a & b")\` → \`"a &amp; b"\`
- \`escapeHtml("&lt;")\` → \`"&amp;lt;"\`  (& first!)
`,
    signature: `function escapeHtml(s: string): string`,
    exportName: "escapeHtml",
    starter: `function escapeHtml(s) {
  // TODO: replace & < > " ' with entities — ampersand FIRST.
  return s;
}`,
    solution: `function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}`,
    tests: [
      { name: "escapes angle brackets", body: `assertEqual(escapeHtml("<script>"), "&lt;script&gt;");` },
      { name: "escapes ampersand", body: `assertEqual(escapeHtml("a & b"), "a &amp; b");` },
      { name: "ampersand goes first (no double-encoding)", body: `assertEqual(escapeHtml("&lt;"), "&amp;lt;");` },
      { name: "escapes both quote types", body: `assertEqual(escapeHtml("\\"'"), "&quot;&#39;");` },
      { name: "leaves plain text alone", body: `assertEqual(escapeHtml("hello world"), "hello world");` },
      { name: "a full attribute-injection payload", body: `assertEqual(escapeHtml("<img src=x onerror=\\"go()\\">"), "&lt;img src=x onerror=&quot;go()&quot;&gt;");` },
    ],
  },
  {
    id: "constant-time-eq",
    chapterId: "ch32",
    title: "Constant-time comparison",
    difficulty: "core",
    tags: ["security", "timing", "auth"],
    prompt: `
Compare two strings for equality **without leaking timing**. A normal \`===\`/loop returns on the *first* mismatched byte, so an attacker measuring response time can recover a secret token one character at a time. Instead, compare **every** character and accumulate the difference (XOR the codes, OR into an accumulator), then report equality at the end.

Return \`false\` immediately if the lengths differ; otherwise scan the whole string regardless of where mismatches occur.

### Examples
- \`constantTimeEqual("token", "token")\` → \`true\`
- \`constantTimeEqual("token", "toker")\` → \`false\`
- \`constantTimeEqual("ab", "abc")\` → \`false\`
`,
    signature: `function constantTimeEqual(a: string, b: string): boolean`,
    exportName: "constantTimeEqual",
    starter: `function constantTimeEqual(a, b) {
  // TODO: no early return on mismatch — OR up the per-char XORs, then compare to 0.
  return false;
}`,
    solution: `function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}`,
    tests: [
      { name: "equal strings", body: `assertEqual(constantTimeEqual("token", "token"), true);` },
      { name: "last-char mismatch", body: `assertEqual(constantTimeEqual("token", "toker"), false);` },
      { name: "first-char mismatch is still detected", body: `assertEqual(constantTimeEqual("Xoken", "token"), false);` },
      { name: "different lengths", body: `assertEqual(constantTimeEqual("ab", "abc"), false);` },
      { name: "empty strings are equal", body: `assertEqual(constantTimeEqual("", ""), true);` },
      { name: "long identical secrets", body: `assertEqual(constantTimeEqual("a3f9c1e0b7", "a3f9c1e0b7"), true);` },
    ],
  },
  // ========================================================================
  // ch33 · Machine learning
  // ========================================================================
  {
    id: "sigmoid",
    chapterId: "ch33",
    title: "The sigmoid",
    difficulty: "intro",
    tags: ["ml", "activation", "probability"],
    prompt: `
Implement the **logistic sigmoid** σ(z) = 1 / (1 + e⁻ᶻ) — the squashing function that turns any real number into a probability in (0, 1). It's the output non-linearity of the binary classifier in ch.33.

- σ(0) = 0.5, σ(+∞) → 1, σ(−∞) → 0, and it's **monotonic increasing**.

### Examples
- \`sigmoid(0)\` → \`0.5\`
- \`sigmoid(2)\` → \`0.8807...\`
`,
    signature: `function sigmoid(z: number): number`,
    exportName: "sigmoid",
    starter: `function sigmoid(z) {
  // TODO: 1 / (1 + e^(-z))
  return 0;
}`,
    solution: `function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}`,
    tests: [
      { name: "sigmoid(0) = 0.5", body: `assert(Math.abs(sigmoid(0) - 0.5) < 1e-9);` },
      { name: "large positive -> ~1", body: `assert(sigmoid(20) > 0.999);` },
      { name: "large negative -> ~0", body: `assert(sigmoid(-20) < 0.001);` },
      { name: "monotonic increasing", body: `assert(sigmoid(1) > sigmoid(0) && sigmoid(0) > sigmoid(-1));` },
      { name: "symmetry: s(-z) = 1 - s(z)", body: `assert(Math.abs(sigmoid(-1.3) - (1 - sigmoid(1.3))) < 1e-9);` },
      { name: "in range (0,1)", body: `assert(sigmoid(5) < 1 && sigmoid(-5) > 0);` },
    ],
  },
  {
    id: "mse-loss",
    chapterId: "ch33",
    title: "Mean squared error",
    difficulty: "intro",
    tags: ["ml", "loss", "regression"],
    prompt: `
Implement **mean squared error**: the average of the squared differences between predictions and the true values — the loss a regression model minimizes.

\`MSE = (1/n) · Σ (predᵢ − actualᵢ)²\`

Assume the arrays are the same non-zero length.

### Examples
- \`mse([1, 2, 3], [1, 2, 3])\` → \`0\`
- \`mse([0, 0], [3, 4])\` → \`12.5\`
`,
    signature: `function mse(pred: number[], actual: number[]): number`,
    exportName: "mse",
    starter: `function mse(pred, actual) {
  // TODO: average the squared differences
  return 0;
}`,
    solution: `function mse(pred, actual) {
  let sum = 0;
  for (let i = 0; i < pred.length; i++) {
    const d = pred[i] - actual[i];
    sum += d * d;
  }
  return sum / pred.length;
}`,
    tests: [
      { name: "perfect prediction -> 0", body: `assert(mse([1, 2, 3], [1, 2, 3]) === 0);` },
      { name: "[0,0] vs [3,4] -> 12.5", body: `assert(Math.abs(mse([0, 0], [3, 4]) - 12.5) < 1e-9);` },
      { name: "single error squared", body: `assert(Math.abs(mse([1], [4]) - 9) < 1e-9);` },
      { name: "order-independent magnitude", body: `assert(Math.abs(mse([2, 0], [0, 2]) - 4) < 1e-9);` },
      { name: "always non-negative", body: `assert(mse([-3, 5], [1, 1]) >= 0);` },
    ],
  },
  // ========================================================================
  // ch34 · Modern AI
  // ========================================================================
  {
    id: "softmax",
    chapterId: "ch34",
    title: "Softmax",
    difficulty: "core",
    tags: ["ml", "attention", "probability"],
    prompt: `
Implement **softmax**: turn a vector of real-valued logits into a probability distribution. Each output is \`exp(zᵢ) / Σ exp(zⱼ)\`, so the outputs are all positive and **sum to 1**. It's the heart of attention (\`softmax(QKᵀ/√d)\`) and of every classifier's final layer.

For numerical stability, **subtract the max logit** before exponentiating (this doesn't change the result but avoids overflow).

### Examples
- \`softmax([0, 0])\` → \`[0.5, 0.5]\`
- \`softmax([2, 1, 0])\` → \`[0.665..., 0.244..., 0.090...]\`
`,
    signature: `function softmax(logits: number[]): number[]`,
    exportName: "softmax",
    starter: `function softmax(logits) {
  // TODO: exponentiate (shifted by the max), then normalize to sum 1
  return logits;
}`,
    solution: `function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}`,
    tests: [
      { name: "rows sum to 1", body: `assert(Math.abs(softmax([2, 1, 0, -1]).reduce((a, b) => a + b, 0) - 1) < 1e-9);` },
      { name: "uniform logits -> uniform probs", body: `const r = softmax([0, 0]); assert(Math.abs(r[0] - 0.5) < 1e-9 && Math.abs(r[1] - 0.5) < 1e-9);` },
      { name: "monotonic: bigger logit -> bigger prob", body: `const r = softmax([2, 1, 0]); assert(r[0] > r[1] && r[1] > r[2]);` },
      { name: "all outputs positive", body: `assert(softmax([-5, 0, 5]).every((p) => p > 0));` },
      { name: "numerically stable for large logits", body: `const r = softmax([1000, 1000]); assert(Math.abs(r[0] - 0.5) < 1e-9 && !Number.isNaN(r[0]));` },
    ],
  },
  {
    id: "cosine-similarity",
    chapterId: "ch34",
    title: "Cosine similarity",
    difficulty: "core",
    tags: ["ml", "embeddings", "vectors"],
    prompt: `
Implement **cosine similarity**: the closeness measure for embedding vectors. It's the cosine of the angle between two vectors — their dot product divided by the product of their lengths:

\`cos(a, b) = (a · b) / (‖a‖ · ‖b‖)\`

It ranges from **1** (same direction) through **0** (orthogonal) to **−1** (opposite), and ignores magnitude — only direction matters. Assume the vectors are the same non-zero length and non-zero.

### Examples
- \`cosineSimilarity([1, 2, 3], [1, 2, 3])\` → \`1\`
- \`cosineSimilarity([1, 0], [0, 1])\` → \`0\`
`,
    signature: `function cosineSimilarity(a: number[], b: number[]): number`,
    exportName: "cosineSimilarity",
    starter: `function cosineSimilarity(a, b) {
  // TODO: dot(a,b) / (norm(a) * norm(b))
  return 0;
}`,
    solution: `function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}`,
    tests: [
      { name: "identical vectors -> 1", body: `assert(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);` },
      { name: "orthogonal -> 0", body: `assert(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9);` },
      { name: "opposite -> -1", body: `assert(Math.abs(cosineSimilarity([1, 0], [-1, 0]) + 1) < 1e-9);` },
      { name: "scale-invariant (direction only)", body: `assert(Math.abs(cosineSimilarity([1, 2], [2, 4]) - 1) < 1e-9);` },
      { name: "symmetric", body: `assert(Math.abs(cosineSimilarity([1, 3], [2, 1]) - cosineSimilarity([2, 1], [1, 3])) < 1e-12);` },
    ],
  },
];

export function kataById(id: string): Kata | undefined {
  return KATAS.find((k) => k.id === id);
}

export function katasForChapter(chapterId: string): Kata[] {
  return KATAS.filter((k) => k.chapterId === chapterId);
}
