// Engine truth-tests for ch.15 (Trees & heaps): the BST + AVL tree
// (bst-builder), the binary heap (heap-operations), and the trie
// (trie-autocomplete). Same tiny Node harness as test-ch14; CI-gated. These
// lock the exact structural guarantees the sims render and the chapter claims:
// a BST's inorder walk is sorted; an AVL tree stays height-balanced under
// adversarial (sorted) insertion via the four rotation cases; a min-heap always
// surfaces its minimum and drains ascending; build-heap produces a valid heap;
// and a trie shares prefixes so lookup is O(key length) and autocomplete is
// "collect the subtree under the prefix".

import {
  balanceFactor,
  build as buildTree,
  height,
  inorder,
  insert,
  isAVLBalanced,
  isValidBST,
  levelorder,
  postorder,
  preorder,
  remove,
  search,
  size,
} from "../src/components/sims/bst-builder/model.ts";
import {
  drainSorted,
  heapify,
  isMinHeap,
  leftOf,
  parentOf,
  peek,
  pop,
  push,
  rightOf,
} from "../src/components/sims/heap-operations/model.ts";
import {
  allWords,
  autocomplete,
  build as buildTrie,
  countNodes,
  createTrie,
  insert as trieInsert,
  search as trieSearch,
  startsWith,
  walkPrefix,
} from "../src/components/sims/trie-autocomplete/model.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}
function ok(name: string, cond: boolean): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

// ================= (A) BST — plain =================
{
  console.log("bst-builder · plain BST:");
  const keys = [8, 3, 10, 1, 6, 14, 4, 7, 13];
  const root = buildTree(keys, false);

  eq("inorder is sorted", inorder(root), [...keys].sort((a, b) => a - b));
  eq("size counts every key", size(root), keys.length);
  ok("isValidBST holds", isValidBST(root));
  // 8 is root; its children are 3 and 10
  eq("preorder starts at the root 8", preorder(root)[0], 8);
  eq("levelorder is breadth-first from the root", levelorder(root).slice(0, 3), [8, 3, 10]);
  eq("postorder ends at the root", postorder(root)[postorder(root).length - 1], 8);

  // search path: 8 → 10 → 14 → 13
  const s = search(root, 13);
  eq("search finds 13 via the root-to-node path", s.path, [8, 10, 14, 13]);
  ok("search found flag", s.found);
  const miss = search(root, 5);
  ok("search misses absent 5", !miss.found);
  eq("miss path walked 8 → 3 → 6 → 4", miss.path, [8, 3, 6, 4]);

  // duplicate insert is a no-op (set semantics)
  const dup = insert(root, 8, false);
  eq("duplicate insert does not grow the tree", size(dup.root), keys.length);

  // deletes: leaf (1), one-child (14 has only 13), two-children (3)
  const delLeaf = remove(root, 1, false);
  ok("delete leaf 1: still a valid BST", isValidBST(delLeaf.root));
  ok("delete leaf 1: removed flag", delLeaf.removed);
  eq("delete leaf 1: 1 is gone", inorder(delLeaf.root).includes(1), false);

  const delTwo = remove(root, 3, false);
  ok("delete two-child 3: still valid BST", isValidBST(delTwo.root));
  eq("delete two-child 3: inorder loses only 3",
    inorder(delTwo.root), inorder(root).filter((k) => k !== 3));

  const delAbsent = remove(root, 999, false);
  ok("delete absent 999: removed = false", !delAbsent.removed);
  eq("delete absent 999: tree unchanged", inorder(delAbsent.root), inorder(root));

  // degenerate: sorted inserts into a PLAIN bst make a stick (height = n)
  const stick = buildTree([1, 2, 3, 4, 5, 6, 7], false);
  eq("plain BST on sorted input degenerates to height n", height(stick), 7);
}

// ================= (B) AVL — the four rotation cases =================
{
  console.log("bst-builder · AVL rotations:");

  // LL: 3,2,1 → right rotation → root 2
  const ll = buildTree([3, 2, 1], true);
  eq("LL case: root becomes the middle key 2", ll?.key, 2);
  eq("LL: inorder still sorted", inorder(ll), [1, 2, 3]);
  ok("LL: balanced", isAVLBalanced(ll));

  // RR: 1,2,3 → left rotation → root 2
  const rr = buildTree([1, 2, 3], true);
  eq("RR case: root becomes 2", rr?.key, 2);
  ok("RR: balanced", isAVLBalanced(rr));

  // LR: 3,1,2 → left-right → root 2
  const lr = buildTree([3, 1, 2], true);
  eq("LR case: root becomes 2", lr?.key, 2);
  ok("LR: balanced", isAVLBalanced(lr));

  // RL: 1,3,2 → right-left → root 2
  const rl = buildTree([1, 3, 2], true);
  eq("RL case: root becomes 2", rl?.key, 2);
  ok("RL: balanced", isAVLBalanced(rl));

  // the headline: sorted insertion that WOULD make a stick stays log-height
  const sortedN = 15;
  const balanced = buildTree(Array.from({ length: sortedN }, (_, i) => i + 1), true);
  ok("AVL on sorted 1..15 is valid BST", isValidBST(balanced));
  ok("AVL on sorted 1..15 stays balanced", isAVLBalanced(balanced));
  eq("AVL height for 15 nodes is 4 (vs 15 for a plain stick)", height(balanced), 4);
  eq("AVL inorder is still sorted", inorder(balanced), Array.from({ length: sortedN }, (_, i) => i + 1));
  ok("AVL root balance factor within {−1,0,1}", Math.abs(balanceFactor(balanced)) <= 1);

  // insert reports rotations happened on the degenerate sequence
  let r = null as ReturnType<typeof insert>["root"];
  let totalRotations = 0;
  for (const k of [1, 2, 3, 4, 5, 6, 7]) {
    const res = insert(r, k, true);
    r = res.root;
    totalRotations += res.rotations;
  }
  ok("AVL performed rotations on ascending inserts", totalRotations >= 3);
  eq("AVL of 1..7 has height 3 (perfect)", height(r), 3);

  // AVL delete keeps the invariants
  let big = buildTree(Array.from({ length: 20 }, (_, i) => i + 1), true);
  for (const k of [5, 10, 15, 1, 20]) big = remove(big, k, true).root;
  ok("AVL after 5 deletes: valid BST", isValidBST(big));
  ok("AVL after 5 deletes: still balanced", isAVLBalanced(big));
  eq("AVL after deletes: exactly the surviving keys, sorted",
    inorder(big), [2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19]);
}

// ================= (C) heap-operations =================
{
  console.log("heap-operations · binary min-heap:");

  // index arithmetic
  eq("parent(0) = -1 (root has no parent)", parentOf(0), -1);
  eq("children of 0 are 1 and 2", [leftOf(0), rightOf(0)], [1, 2]);
  eq("parent of 4 is 1", parentOf(4), 1);

  // push maintains the min-heap and bubbles the smallest to the root
  let heap: number[] = [];
  for (const k of [5, 3, 8, 1, 9, 2]) heap = push(heap, k).array;
  ok("after pushes the array is a valid min-heap", isMinHeap(heap));
  eq("the minimum sits at the root", peek(heap), 1);

  // a push that must climb to the root
  const climb = push([2, 5, 8, 9], 1); // 1 is smaller than everything → becomes root
  eq("pushing a new global min lands it at the root", climb.array[0], 1);
  ok("push kept the heap valid", isMinHeap(climb.array));
  ok("that push performed swaps (it climbed)", climb.swaps >= 1);

  // pop returns the minimum and restores the heap
  const p = pop(heap);
  eq("pop returns the minimum", p.min, 1);
  ok("after pop the heap is still valid", isMinHeap(p.array));
  ok("pop removed exactly one element", p.array.length === heap.length - 1);
  eq("pop on empty returns null", pop([]).min, null);

  // draining a heap yields ascending order (it IS a priority queue)
  eq("drainSorted gives ascending order", drainSorted(heap), [...heap].sort((a, b) => a - b));

  // build-heap (Floyd) turns an arbitrary array into a valid heap
  const raw = [9, 4, 7, 1, 8, 3, 6, 2, 5, 0];
  const built = heapify(raw);
  ok("heapify produces a valid min-heap", isMinHeap(built.array));
  eq("heapify preserves the multiset", [...built.array].sort((a, b) => a - b), [...raw].sort((a, b) => a - b));
  eq("heapify surfaces the global minimum at the root", built.array[0], 0);
  // Floyd build-heap does < n swaps (its O(n) hallmark — far below n log n)
  ok(`heapify swap count is sub-n·log n (${built.swaps} < ${raw.length * Math.ceil(Math.log2(raw.length))})`,
    built.swaps < raw.length * Math.ceil(Math.log2(raw.length)));

  // determinism
  eq("heapify deterministic", heapify(raw).array, built.array);
}

// ================= (D) trie-autocomplete =================
{
  console.log("trie-autocomplete · prefix tree:");

  const words = ["car", "card", "care", "cat", "dog", "do"];
  const t = buildTrie(words);

  // membership vs prefix
  ok("search finds a stored word", trieSearch(t, "car").found);
  ok("search rejects a prefix that is not a stored word", !trieSearch(t, "ca").found);
  ok("startsWith accepts a real prefix", startsWith(t, "ca"));
  ok("startsWith rejects an absent prefix", !startsWith(t, "z"));
  ok('“do” is BOTH a word and a prefix of “dog”', trieSearch(t, "do").found && startsWith(t, "do"));

  // allWords round-trips the set, sorted
  eq("allWords returns exactly the inserted set, sorted", allWords(t), [...words].sort());

  // autocomplete = collect the subtree under the prefix
  eq('autocomplete("car")', autocomplete(t, "car"), ["car", "card", "care"]);
  eq('autocomplete("ca")', autocomplete(t, "ca"), ["car", "card", "care", "cat"]);
  eq('autocomplete("do")', autocomplete(t, "do"), ["do", "dog"]);
  eq('autocomplete of an absent prefix is empty', autocomplete(t, "zz"), []);
  eq("autocomplete respects the limit", autocomplete(t, "ca", 2), ["car", "card"]);

  // prefix SHARING: 6 words / 19 characters, but far fewer nodes because
  // c-a-r and d-o are each stored once. Root + {c,a,r,d,e,t,d,o,g} unique
  // path chars. Count is deterministic; pin it.
  eq("shared prefixes mean fewer nodes than total characters", countNodes(t), 10);
  const totalChars = words.reduce((s, w) => s + w.length, 0);
  ok(`node count (${countNodes(t)}) < total characters (${totalChars})`, countNodes(t) < totalChars);

  // walkPrefix trace: reuse existing edges, then miss
  const w1 = walkPrefix(t, "ca");
  ok("walkPrefix reaches the 'a' node for prefix 'ca'", w1.node !== null);
  const w2 = walkPrefix(t, "cx");
  ok("walkPrefix returns null on a broken path", w2.node === null);

  // inserting a word that shares a prefix adds only the NEW suffix nodes
  const t2 = createTrie();
  const first = trieInsert(t2, "car"); // creates c,a,r → 3 nodes
  const second = trieInsert(t2, "care"); // reuses c,a,r → creates only 'e'
  eq("first insert of 'car' creates 3 nodes", first.created, 3);
  eq("insert of 'care' reuses the shared prefix, creating just 1", second.created, 1);
}

if (failed > 0) {
  console.error(`\n✗ test-ch15: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch15: all checks pass");
