// The Depth lens (§6 #1): one guide, two courses. Global, persisted,
// re-renders every chapter. 'Foundations' hides senior blocks + formal
// corners (with a visible teaser count); 'Senior' shows everything.
import { useLens } from "../../lib/progress.ts";
import { cx } from "../../lib/utils.ts";

export default function LensToggle() {
  const [lens, setLens] = useLens();
  return (
    <div className="lens-toggle" role="group" aria-label="Depth lens">
      <button
        type="button"
        className={cx("lens-btn", lens === "foundations" && "on")}
        aria-pressed={lens === "foundations"}
        onClick={() => setLens("foundations")}
        title="Visual, from zero — senior blocks hidden"
      >
        🌱 Foundations
      </button>
      <button
        type="button"
        className={cx("lens-btn", lens === "senior" && "on")}
        aria-pressed={lens === "senior"}
        onClick={() => setLens("senior")}
        title="Everything: internals, trade-offs, interview depth"
      >
        🔬 Senior
      </button>
    </div>
  );
}
