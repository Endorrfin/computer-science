// ch.24 · Files & storage — engine checks (inode resolution + allocation).
// Run: node --experimental-strip-types scripts/test-ch24.ts
import {
  DEFAULT_INODE,
  pointersPerBlock,
  offsetToBlock,
  regionCapacities,
  maxFileSize,
  resolve,
  firstFit,
  freeCount,
  largestFreeRun,
  freeHoles,
  externalFragmentation,
  blocksConsumed,
  randomReadCost,
} from "../src/components/sims/files/model.ts";
import type { InodeConfig } from "../src/components/sims/files/model.ts";

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
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}

// A small config makes the region boundaries hand-checkable:
//   blockSize 1024, pointerSize 4 → ppb = 256; nDirect = 12.
const small: InodeConfig = { blockSize: 1024, pointerSize: 4, nDirect: 12 };

// ================= (A) inode geometry =================
{
  console.log("inode · geometry:");
  eq("ppb (default 4096/4)", pointersPerBlock(DEFAULT_INODE), 1024);
  eq("ppb (small 1024/4)", pointersPerBlock(small), 256);
  eq("region capacities (small)", regionCapacities(small), {
    direct: 12,
    single: 256,
    double: 256 * 256,
    triple: 256 * 256 * 256,
  });
  // max file size (small) = (12 + 256 + 65536 + 16777216) * 1024 bytes
  eq("max file size (small)", maxFileSize(small), (12 + 256 + 65536 + 16777216) * 1024);
  // default inode addresses just over 4 TiB
  ok("default max file size > 4 TiB", maxFileSize(DEFAULT_INODE) > 4 * 2 ** 40, `got ${maxFileSize(DEFAULT_INODE)}`);
}

// ================= (B) offset → block split =================
{
  console.log("inode · offset split:");
  eq("offset 0", offsetToBlock(small, 0), { logicalBlock: 0, offsetInBlock: 0 });
  eq("offset 1023 stays in block 0", offsetToBlock(small, 1023), { logicalBlock: 0, offsetInBlock: 1023 });
  eq("offset 1024 → block 1", offsetToBlock(small, 1024), { logicalBlock: 1, offsetInBlock: 0 });
  eq("offset 5000", offsetToBlock(small, 5000), { logicalBlock: 4, offsetInBlock: 5000 - 4 * 1024 });
}

// ================= (C) inode resolution regions + read cost =================
{
  console.log("inode · resolution:");
  // logical block 0..11 → direct, 1 read
  eq("block 0 → direct, 1 read", { region: resolve(small, 0).region, reads: resolve(small, 0).reads }, { region: "direct", reads: 1 });
  eq("block 11 (last direct)", { region: resolve(small, 11 * 1024).region, reads: resolve(small, 11 * 1024).reads }, { region: "direct", reads: 1 });
  // block 12 → single indirect, 2 reads
  eq("block 12 → single, 2 reads", { region: resolve(small, 12 * 1024).region, reads: resolve(small, 12 * 1024).reads }, { region: "single", reads: 2 });
  // last single-indirect block = 12 + 256 - 1 = 267
  eq("block 267 (last single)", { region: resolve(small, 267 * 1024).region, reads: resolve(small, 267 * 1024).reads }, { region: "single", reads: 2 });
  // block 268 → double indirect, 3 reads
  eq("block 268 → double, 3 reads", { region: resolve(small, 268 * 1024).region, reads: resolve(small, 268 * 1024).reads }, { region: "double", reads: 3 });
  // first triple-indirect block = 12 + 256 + 256*256 = 65804 → 4 reads
  const firstTriple = 12 + 256 + 256 * 256;
  eq("first triple block → 4 reads", { region: resolve(small, firstTriple * 1024).region, reads: resolve(small, firstTriple * 1024).reads }, { region: "triple", reads: 4 });
  // one past the max file → out of range
  const lastBlock = 12 + 256 + 256 * 256 + 256 * 256 * 256 - 1;
  eq("last addressable block resolves", resolve(small, lastBlock * 1024).region, "triple");
  eq("one block past max → out-of-range", resolve(small, (lastBlock + 1) * 1024).region, "out-of-range");
  // double-indirect index math: block 268 is the FIRST double block → L1[0], L2[0]
  eq("double index path (block 268)", resolve(small, 268 * 1024).path, ["inode.doubleIndirect", "→ L1[0]", "→ L2[0]", "→ data block"]);
  // block 268 + 256 → L1[1], L2[0]
  eq("double index path (block 268+256)", resolve(small, (268 + 256) * 1024).path, ["inode.doubleIndirect", "→ L1[1]", "→ L2[0]", "→ data block"]);
}

// ================= (D) allocation · first-fit =================
{
  console.log("allocation · first-fit:");
  // free = true. Disk of 10 blocks, some used.
  const disk = [true, true, false, true, true, true, false, true, true, true];
  eq("first-fit len 3 → index 3", firstFit(disk, 3), 3);
  eq("first-fit len 2 → index 0", firstFit(disk, 2), 0);
  eq("first-fit len 4 → -1 (no hole)", firstFit(disk, 4), -1);
  eq("first-fit len 0 → -1", firstFit(disk, 0), -1);
  const full = [false, false, false];
  eq("first-fit on full disk → -1", firstFit(full, 1), -1);
  const empty = [true, true, true, true];
  eq("first-fit whole disk", firstFit(empty, 4), 0);
}

// ================= (E) allocation · fragmentation =================
{
  console.log("allocation · fragmentation:");
  const disk = [true, true, false, true, true, true, false, true, true, true];
  eq("free count", freeCount(disk), 8);
  eq("largest free run", largestFreeRun(disk), 3);
  eq("free holes", freeHoles(disk), 3);
  // external frag = 1 - largestRun/totalFree = 1 - 3/8 = 0.625
  ok("external fragmentation ≈ 0.625", Math.abs(externalFragmentation(disk) - 0.625) < 1e-9, `got ${externalFragmentation(disk)}`);
  const contiguousFree = [false, false, true, true, true, true];
  eq("no fragmentation when free space is one run", externalFragmentation(contiguousFree), 0);
  eq("no free space → 0 frag", externalFragmentation([false, false]), 0);
}

// ================= (F) allocation · cost model =================
{
  console.log("allocation · cost:");
  eq("indexed spends 1 extra block", blocksConsumed("indexed", 10), 11);
  eq("contiguous spends exactly data blocks", blocksConsumed("contiguous", 10), 10);
  eq("linked spends exactly data blocks", blocksConsumed("linked", 10), 10);
  eq("empty file consumes 0", blocksConsumed("indexed", 0), 0);
  // random read cost of the 5th data block (index 4)
  eq("contiguous random read = 1", randomReadCost("contiguous", 4), 1);
  eq("indexed random read = 2", randomReadCost("indexed", 4), 2);
  eq("linked random read walks the chain = i+1", randomReadCost("linked", 4), 5);
  eq("linked head block = 1 read", randomReadCost("linked", 0), 1);
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch24: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch24: all checks pass");
