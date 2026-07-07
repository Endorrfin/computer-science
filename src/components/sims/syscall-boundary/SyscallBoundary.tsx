// [micro] syscall-boundary — ch.22 "Processes & scheduling". A stepper that
// shows what a system call physically IS: the controlled crossing from
// unprivileged USER mode into privileged KERNEL mode and back. User code can't
// jump into the kernel — it can only TRAP to one vetted entry point, and the
// hardware mode bit is what enforces the wall. Self-contained: the stages are a
// fixed array, not a computed sim. Transport mirrors cache-sim (useState cursor
// + useEffect interval keyed to speed, reduced-motion → step only).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import "../../../theme/_p6css/syscall-boundary.css";

const ACCENT = "#22d3ee";

type Mode = "user" | "kernel";
type Focus = "user" | "kernel" | "boundary";

type Stage = {
  mode: Mode; // CPU privilege / mode bit at this instant
  focus: Focus; // which lane (or the wall) the eye should land on
  token: 0 | 1; // control-token position: 0 = user side, 1 = kernel side
  label: string; // short tag for the step chip
  caption: string; // one crisp sentence
};

// A read() syscall, start to finish. The token flips side at the trap (→ kernel)
// and again at return-from-trap (→ user); every other step leaves it put.
const STAGES: readonly Stage[] = [
  {
    mode: "user",
    focus: "user",
    token: 0,
    label: "runs",
    caption:
      "The process runs in USER mode. It wants bytes from a file — but it cannot touch the disk itself.",
  },
  {
    mode: "user",
    focus: "user",
    token: 0,
    label: "args",
    caption:
      "It loads the syscall number and arguments (fd, buffer, count) into registers — the call's ABI.",
  },
  {
    mode: "user",
    focus: "boundary",
    token: 0,
    label: "trap",
    caption:
      "It executes a TRAP instruction (`syscall`). User code can request a crossing — it can never jump across on its own.",
  },
  {
    mode: "kernel",
    focus: "boundary",
    token: 1,
    label: "enter",
    caption:
      "Hardware flips the mode bit to KERNEL and jumps to ONE fixed entry point — the dispatcher — not an address the caller chose.",
  },
  {
    mode: "kernel",
    focus: "kernel",
    token: 1,
    label: "serve",
    caption:
      "The kernel validates every argument, then does the privileged work: it drives the device and reads the block.",
  },
  {
    mode: "user",
    focus: "boundary",
    token: 0,
    label: "return",
    caption:
      "The kernel writes the result, then return-from-trap flips the mode bit back to USER and restores the caller.",
  },
  {
    mode: "user",
    focus: "user",
    token: 0,
    label: "resume",
    caption:
      "The process resumes on the instruction right after the trap — now holding the bytes it asked for.",
  },
];

const LAST = STAGES.length - 1;

// SVG geometry (viewBox units). Two stacked lanes split by a hard wall.
const W = 680;
const H = 300;
const WALL_Y = H / 2;
const TOKEN_X_USER = 150;
const TOKEN_X_KERNEL = 530;
const TOKEN_Y_USER = WALL_Y - 66;
const TOKEN_Y_KERNEL = WALL_Y + 66;

export default function SyscallBoundary() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0); // stage cursor, 0..LAST
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const stage = STAGES[i];
  const mode = stage.mode;

  // Play loop: ~1 stage/sec at 1× (slow enough to read a full caption), scaled
  // by speed. Auto-stops at the last stage. Mirrors cache-sim / scheduler-sim.
  useEffect(() => {
    if (!running) return;
    const ms = Math.max(220, 1000 / speed);
    const id = window.setInterval(() => {
      setI((x) => {
        if (x >= LAST) {
          setRunning(false);
          return LAST;
        }
        return x + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [running, speed]);

  function onToggle() {
    if (running) {
      setRunning(false);
      return;
    }
    setI((x) => (x >= LAST ? 0 : x)); // replay from the top once finished
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setI((x) => Math.min(LAST, x + 1));
  }
  function onReset() {
    setRunning(false);
    setI(0);
  }

  const modeText = mode === "kernel" ? "kernel" : "user";
  const status = `step ${i + 1} / ${STAGES.length} · mode: ${modeText}`;
  const aria =
    `System-call boundary, step ${i + 1} of ${STAGES.length}. CPU mode bit: ${modeText}. ` +
    stage.caption.replace(/`/g, "");

  const tokenX = stage.token === 1 ? TOKEN_X_KERNEL : TOKEN_X_USER;
  const tokenY = stage.token === 1 ? TOKEN_Y_KERNEL : TOKEN_Y_USER;
  const atBoundary = stage.focus === "boundary";

  return (
    <SimShell
      title="System call — crossing the privilege boundary"
      simKey="syscall-boundary"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="syb-modebit" role="group" aria-label="CPU privilege mode bit">
          <span className="syb-modebit-lbl">mode bit</span>
          <span className={cx("syb-modebit-val", `is-${mode}`)}>
            {mode === "kernel" ? "1 · KERNEL" : "0 · USER"}
          </span>
        </div>
      }
      footer={
        <ol className="syb-steps" aria-label="System-call stages">
          {STAGES.map((s, idx) => (
            <li
              key={idx}
              className={cx("syb-step", idx === i && "on", idx < i && "done", `is-${s.mode}`)}
              aria-current={idx === i ? "step" : undefined}
            >
              <span className="syb-step-n">{idx + 1}</span>
              <span className="syb-step-t">{s.label}</span>
            </li>
          ))}
        </ol>
      }
    >
      <div className="syb-stage">
        <div
          className="syb-diagram"
          role="img"
          aria-label={aria}
          style={{ "--syb-accent": ACCENT } as CSSProperties}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            {/* USER lane (top) */}
            <g className={cx("syb-lane", "is-user", stage.focus === "user" && "active")}>
              <rect
                x={12}
                y={12}
                width={W - 24}
                height={WALL_Y - 24}
                rx={12}
                fill="color-mix(in srgb, var(--sem-data) 8%, var(--surface))"
                stroke="color-mix(in srgb, var(--sem-data) 40%, var(--line))"
                strokeWidth={stage.focus === "user" ? 2 : 1}
              />
              <text x={30} y={40} className="syb-lane-lbl" style={{ fill: "var(--sem-data)" }}>
                USER MODE · unprivileged
              </text>
              <text x={30} y={62} className="syb-lane-sub">
                your process — no direct access to devices
              </text>

              {/* register file: the ABI slots the caller fills before trapping */}
              <g className={cx("syb-regs", (i === 1 || i === 2) && "hot")}>
                <text x={30} y={104} className="syb-tiny">
                  registers
                </text>
                {["nr=read", "fd", "buf", "count"].map((r, ri) => (
                  <g key={r}>
                    <rect
                      x={30 + ri * 78}
                      y={112}
                      width={70}
                      height={26}
                      rx={6}
                      fill="var(--bg)"
                      stroke={i >= 1 ? "var(--sem-data)" : "var(--line)"}
                      strokeWidth={1}
                      opacity={i >= 1 ? 1 : 0.55}
                    />
                    <text x={30 + ri * 78 + 35} y={129} className="syb-reg-t" textAnchor="middle">
                      {r}
                    </text>
                  </g>
                ))}
              </g>
            </g>

            {/* KERNEL lane (bottom) */}
            <g className={cx("syb-lane", "is-kernel", stage.focus === "kernel" && "active")}>
              <rect
                x={12}
                y={WALL_Y + 12}
                width={W - 24}
                height={WALL_Y - 24}
                rx={12}
                fill="color-mix(in srgb, var(--sem-control) 8%, var(--surface))"
                stroke="color-mix(in srgb, var(--sem-control) 40%, var(--line))"
                strokeWidth={stage.focus === "kernel" ? 2 : 1}
              />
              <text
                x={30}
                y={WALL_Y + 40}
                className="syb-lane-lbl"
                style={{ fill: "var(--sem-control)" }}
              >
                KERNEL MODE · privileged
              </text>
              <text x={30} y={WALL_Y + 62} className="syb-lane-sub">
                validates args, drives the device
              </text>

              {/* the single vetted entry point — NOT an arbitrary address */}
              <g className={cx("syb-entry", (i === 3 || i === 4) && "hot")}>
                <rect
                  x={W / 2 - 96}
                  y={WALL_Y + 84}
                  width={192}
                  height={44}
                  rx={8}
                  fill={
                    i >= 3 && i <= 4
                      ? "color-mix(in srgb, var(--sem-control) 22%, var(--surface))"
                      : "var(--bg)"
                  }
                  stroke="var(--sem-control)"
                  strokeWidth={i >= 3 && i <= 4 ? 2 : 1}
                />
                <text
                  x={W / 2}
                  y={WALL_Y + 104}
                  className="syb-entry-t"
                  textAnchor="middle"
                  style={{ fill: "var(--sem-control)" }}
                >
                  syscall dispatcher
                </text>
                <text x={W / 2} y={WALL_Y + 120} className="syb-tiny" textAnchor="middle">
                  the one fixed entry point
                </text>
              </g>
            </g>

            {/* the privilege boundary: a hard, visually strong wall */}
            <line
              x1={0}
              y1={WALL_Y}
              x2={W}
              y2={WALL_Y}
              className="syb-wall"
              stroke="var(--syb-accent)"
              strokeWidth={3}
            />
            <rect
              x={W / 2 - 118}
              y={WALL_Y - 15}
              width={236}
              height={30}
              rx={15}
              fill="var(--bg)"
              stroke="var(--syb-accent)"
              strokeWidth={2}
            />
            <text
              x={W / 2}
              y={WALL_Y + 5}
              className="syb-wall-lbl"
              textAnchor="middle"
              style={{ fill: "var(--syb-accent)" }}
            >
              PRIVILEGE BOUNDARY
            </text>

            {/* the only legal doorway through the wall — the trap gate */}
            <g className={cx("syb-gate", atBoundary && "open")}>
              <rect
                x={W / 2 - 20}
                y={WALL_Y - 15}
                width={40}
                height={30}
                rx={4}
                fill={atBoundary ? "color-mix(in srgb, var(--syb-accent) 30%, var(--bg))" : "var(--bg)"}
                stroke="var(--syb-accent)"
                strokeWidth={2}
              />
            </g>

            {/* the control token — the thread of execution, sliding across at
                the trap and the return. Its motion is the crossing. */}
            <g
              className={cx("syb-token", reduced && "no-anim")}
              style={{ transform: `translate(${tokenX}px, ${tokenY}px)` }}
            >
              <circle
                r={16}
                fill={mode === "kernel" ? "var(--sem-control)" : "var(--sem-data)"}
                stroke="var(--bg)"
                strokeWidth={2}
              />
              <text className="syb-token-t" textAnchor="middle" y={4}>
                CPU
              </text>
            </g>
          </svg>
        </div>

        <p className="syb-caption" aria-hidden="true">
          <span className={cx("syb-caption-n", `is-${mode}`)}>{i + 1}</span>
          <Caption text={stage.caption} />
        </p>

        <div className="syb-teach" aria-hidden="true">
          <span className="syb-teach-item">
            <b>Only one door.</b> User code can&apos;t call an arbitrary kernel address — just the
            vetted entry point.
          </span>
          <span className="syb-teach-item">
            <b>The mode bit is hardware.</b> The CPU, not the OS, enforces the wall — flip it and the
            crossing is real.
          </span>
        </div>
      </div>
    </SimShell>
  );
}

// Render a caption, styling `back-ticked` fragments as inline code without
// dangerouslySetInnerHTML.
function Caption({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <span className="syb-caption-t">
      {parts.map((p, idx) =>
        p.startsWith("`") && p.endsWith("`") ? (
          <code key={idx} className="syb-kbd">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={idx}>{p}</span>
        ),
      )}
    </span>
  );
}
