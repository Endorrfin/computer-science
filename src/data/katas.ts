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
];

export function kataById(id: string): Kata | undefined {
  return KATAS.find((k) => k.id === id);
}

export function katasForChapter(chapterId: string): Kata[] {
  return KATAS.filter((k) => k.chapterId === chapterId);
}
