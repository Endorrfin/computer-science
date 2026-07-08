// ch.0a · The Map — discipline-map integrity. The map is a small graph of the
// ten areas of CS and the ideas that link them; the test proves it stays a
// faithful, connected picture: each area maps to a real content part, the ten
// parts p1…p10 are each covered exactly once, links join real areas without
// self-loops or duplicates, neighbours are symmetric, and the graph is one
// connected whole. Run: node --experimental-strip-types scripts/test-ch0a.ts
import { AREAS, LINKS, areaById, neighborsOf, isConnected } from "../src/components/sims/orientation/map.ts";
import { PARTS, partById } from "../src/data/curriculum.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

{
  console.log("map · areas:");
  ok("ten areas", AREAS.length === 10, `count = ${AREAS.length}`);
  ok("area ids are unique", new Set(AREAS.map((a) => a.id)).size === AREAS.length);
  ok("slots are the distinct ring positions 0…9", JSON.stringify([...AREAS.map((a) => a.slot)].sort((x, y) => x - y)) === JSON.stringify([0,1,2,3,4,5,6,7,8,9]));
  ok("every area maps to a real part", AREAS.every((a) => partById(a.partId) !== undefined), AREAS.filter((a) => !partById(a.partId)).map((a) => a.partId).join(", "));
  ok("every area has a name and a blurb", AREAS.every((a) => a.name.length > 0 && a.blurb.length > 10));

  console.log("map · coverage of the ten content parts:");
  const contentParts = PARTS.filter((p) => p.id !== "p0" && p.id !== "p11").map((p) => p.id).sort();
  const covered = [...new Set(AREAS.map((a) => a.partId))].sort();
  ok("areas cover exactly p1…p10, one each", JSON.stringify(covered) === JSON.stringify(contentParts), `covered: ${covered.join(",")}`);

  console.log("map · links:");
  ok("every link joins two real areas", LINKS.every((l) => areaById(l.from) && areaById(l.to)));
  ok("no self-links", LINKS.every((l) => l.from !== l.to));
  ok("no duplicate (undirected) links", (() => {
    const seen = new Set<string>();
    for (const l of LINKS) {
      const key = [l.from, l.to].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  })());
  ok("every link carries a crossing-idea label", LINKS.every((l) => l.label.length > 3));

  console.log("map · graph shape:");
  ok("neighbours are symmetric", AREAS.every((a) => neighborsOf(a.id).every((nb) => neighborsOf(nb.area.id).some((back) => back.area.id === a.id))));
  ok("no area is isolated", AREAS.every((a) => neighborsOf(a.id).length > 0));
  ok("the discipline map is connected", isConnected());
}

console.log(failed === 0 ? "\n✓ ch.0a discipline map: all checks pass" : `\n✗ ch.0a: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
