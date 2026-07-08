// [fig] rsa-locks (ch.31) — RSA as a public padlock with a private key. The
// trapdoor is asymmetry: anyone can snap the PUBLIC lock shut (encrypt with e),
// but only the holder of the PRIVATE key can open it (decrypt with d) — and
// running the same machinery backwards (sign with d, verify with e) proves who
// wrote a message. We walk the tested toy key end to end: pick primes p=5, q=11,
// build n=55, φ=40, choose e=3, derive d=27, then lock m=7 → 13, unlock 13 → 7,
// and sign/verify. EVERY number below comes verbatim from the engine
// (rsaKeygen / rsaEncrypt / rsaDecrypt / rsaSign / rsaVerify in
// ../sims/crypto/rsa.ts) — nothing is recomputed here. Stepped SVG (§6); never a
// GIF in-app. Prefix: rsa-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";
import {
  rsaKeygen,
  rsaEncrypt,
  rsaDecrypt,
  rsaSign,
  rsaVerify,
  DEFAULT_RSA,
} from "../sims/crypto/rsa.ts";
import "../../theme/_p9css/rsa-locks.css";

const ACCENT = "#818CF8";

const VB_W = 680;
const VB_H = 400;

// The engine is the source of truth. DEFAULT_RSA = { p:5, q:11, e:3 }.
const KEY = rsaKeygen(DEFAULT_RSA.p, DEFAULT_RSA.q, DEFAULT_RSA.e);
const MSG = 7; // the plaintext number we lock
const CIPHER = rsaEncrypt(MSG, KEY); // 13
const PLAIN = rsaDecrypt(CIPHER, KEY); // 7 — round-trips
const SIG = rsaSign(MSG, KEY); // 28
const VERIFIED = rsaVerify(SIG, KEY); // 7 — recovers the message

// ---- small SVG primitives ----

function note(text: string): ReactNode {
  return (
    <text x={26} y={382} className="rsa-note">
      {text}
    </text>
  );
}

// A framed heading chip, top-left of every frame.
function Heading({ kicker, title }: { kicker: string; title: string }): ReactNode {
  return (
    <g>
      <text x={26} y={38} className="rsa-kicker">
        {kicker}
      </text>
      <text x={26} y={62} className="rsa-title">
        {title}
      </text>
    </g>
  );
}

// A boxed value tile: a labelled monospace number.
function ValueTile({
  x,
  y,
  w,
  label,
  value,
  tone = "neutral",
  sub,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  value: string;
  tone?: "neutral" | "public" | "private" | "ok";
  sub?: string;
}): ReactNode {
  const h = sub ? 66 : 52;
  return (
    <g className={`rsa-tile rsa-tile--${tone}`}>
      <rect x={x} y={y} width={w} height={h} rx={9} />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" className="rsa-tile-lbl">
        {label}
      </text>
      <text x={x + w / 2} y={y + 42} textAnchor="middle" className="rsa-tile-val">
        {value}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + 58} textAnchor="middle" className="rsa-tile-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

// The PUBLIC padlock — a shackle over a body, drawn open or locked. This is the
// public key: anyone can pick it up and snap it shut.
function Padlock({
  cx,
  cy,
  state,
  scale = 1,
}: {
  cx: number;
  cy: number;
  state: "open" | "locked";
  scale?: number;
}): ReactNode {
  const bodyW = 58 * scale;
  const bodyH = 46 * scale;
  const bx = cx - bodyW / 2;
  const by = cy - bodyH / 2 + 8 * scale;
  const r = 15 * scale; // shackle radius
  const shackleTop = by - 28 * scale;
  // Open: right leg lifted and rotated out; Locked: both legs seated in the body.
  const shackle =
    state === "locked"
      ? `M ${cx - r} ${by} L ${cx - r} ${shackleTop + r}
         A ${r} ${r} 0 0 1 ${cx + r} ${shackleTop + r}
         L ${cx + r} ${by}`
      : `M ${cx - r} ${by} L ${cx - r} ${shackleTop + r}
         A ${r} ${r} 0 0 1 ${cx + r} ${shackleTop + r}
         L ${cx + r} ${by - 20 * scale}`;
  return (
    <g
      className={`rsa-lock rsa-lock--${state}`}
      role="img"
      aria-label={state === "locked" ? "public padlock, locked" : "public padlock, open"}
    >
      <path className="rsa-lock-shackle" d={shackle} fill="none" />
      <rect className="rsa-lock-body" x={bx} y={by} width={bodyW} height={bodyH} rx={8 * scale} />
      <circle className="rsa-lock-keyhole" cx={cx} cy={by + bodyH * 0.42} r={4.5 * scale} />
      <rect
        className="rsa-lock-keyhole"
        x={cx - 1.6 * scale}
        y={by + bodyH * 0.42}
        width={3.2 * scale}
        height={12 * scale}
        rx={1.4 * scale}
      />
    </g>
  );
}

// The PRIVATE key — a bow + blade + bit. Only its holder can open the padlock.
function PrivateKey({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }): ReactNode {
  const bowR = 13 * scale;
  const bladeX = cx + bowR;
  const bladeLen = 44 * scale;
  return (
    <g className="rsa-key" role="img" aria-label="private key">
      <circle className="rsa-key-bow" cx={cx} cy={cy} r={bowR} />
      <circle className="rsa-key-eye" cx={cx} cy={cy} r={5 * scale} />
      <rect className="rsa-key-blade" x={bladeX} y={cy - 3 * scale} width={bladeLen} height={6 * scale} rx={2} />
      <rect className="rsa-key-bit" x={bladeX + bladeLen - 16 * scale} y={cy + 3 * scale} width={5 * scale} height={9 * scale} />
      <rect className="rsa-key-bit" x={bladeX + bladeLen - 8 * scale} y={cy + 3 * scale} width={5 * scale} height={13 * scale} />
    </g>
  );
}

// A labelled actor bubble ("anyone" / "holder") to anchor who does what.
function Actor({ x, y, label, tone }: { x: number; y: number; label: string; tone: "public" | "private" }): ReactNode {
  return (
    <g className={`rsa-actor rsa-actor--${tone}`}>
      <rect x={x} y={y} width={128} height={26} rx={13} />
      <text x={x + 64} y={y + 17} textAnchor="middle" className="rsa-actor-lbl">
        {label}
      </text>
    </g>
  );
}

// A transformation arrow with an operation label above and a formula below.
function OpArrow({
  x1,
  x2,
  y,
  op,
  formula,
  tone,
}: {
  x1: number;
  x2: number;
  y: number;
  op: string;
  formula: string;
  tone: "public" | "private" | "ok";
}): ReactNode {
  const mid = (x1 + x2) / 2;
  const marker =
    tone === "private" ? "url(#rsa-arrow-priv)" : tone === "ok" ? "url(#rsa-arrow-ok)" : "url(#rsa-arrow-pub)";
  return (
    <g className={`rsa-op rsa-op--${tone}`}>
      <text x={mid} y={y - 14} textAnchor="middle" className="rsa-op-label">
        {op}
      </text>
      <line className="rsa-op-line" x1={x1} y1={y} x2={x2} y2={y} markerEnd={marker} />
      <text x={mid} y={y + 22} textAnchor="middle" className="rsa-op-formula">
        {formula}
      </text>
    </g>
  );
}

// Shared arrow-head defs, tinted per operation kind.
function Defs(): ReactNode {
  return (
    <defs>
      <marker id="rsa-arrow-pub" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
      </marker>
      <marker id="rsa-arrow-priv" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-state)" />
      </marker>
      <marker id="rsa-arrow-ok" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-ok)" />
      </marker>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Frames. Each caption states the fact the SVG dramatizes; every number is read
// from KEY / CIPHER / PLAIN / SIG / VERIFIED above.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — pick two primes
  {
    caption: `Start with a secret only you know: two prime numbers. Here p = ${KEY.p} and q = ${KEY.q}. Multiplying them is easy; the security of RSA rests on the reverse — factoring their product back into p and q — being (believed) hard for large primes. These two are the seed of the whole key pair.`,
    render: () => (
      <g>
        <Defs />
        <Heading kicker="RSA · step 1 — the secret seed" title="Pick two primes" />
        <ValueTile x={172} y={150} w={140} label="prime p" value={String(KEY.p)} tone="private" />
        <text x={340} y={190} textAnchor="middle" className="rsa-times">
          ×
        </text>
        <ValueTile x={368} y={150} w={140} label="prime q" value={String(KEY.q)} tone="private" />
        <text x={340} y={252} textAnchor="middle" className="rsa-hint">
          easy to multiply · hard to factor back
        </text>
        <PrivateKey cx={200} cy={310} scale={0.95} />
        <text x={310} y={316} className="rsa-inline">
          both primes stay private
        </text>
        {note("multiplying is the trapdoor's easy direction; factoring n back is the hard one.")}
      </g>
    ),
  },

  // 1 — n = p·q, φ = (p-1)(q-1)
  {
    caption: `Multiply the primes to get the PUBLIC modulus n = p·q = ${KEY.n}. From the same primes compute Euler's totient φ = (p−1)(q−1) = ${KEY.phi} — this stays private. n will be published to the world; φ is the trapdoor knowledge that lets only you finish building the key.`,
    render: () => (
      <g>
        <Defs />
        <Heading kicker="RSA · step 2 — the modulus" title="n = p · q,  φ = (p−1)(q−1)" />
        <ValueTile x={64} y={158} w={120} label="p" value={String(KEY.p)} tone="private" />
        <text x={200} y={196} textAnchor="middle" className="rsa-times">
          ×
        </text>
        <ValueTile x={216} y={158} w={120} label="q" value={String(KEY.q)} tone="private" />
        <OpArrow x1={352} x2={412} y={186} op="" formula="" tone="public" />
        <ValueTile x={428} y={150} w={180} label="modulus n  (PUBLIC)" value={String(KEY.n)} tone="public" sub={`= ${KEY.p} × ${KEY.q}`} />
        <ValueTile x={216} y={272} w={220} label="totient φ  (private)" value={String(KEY.phi)} tone="private" sub={`= (${KEY.p}−1)(${KEY.q}−1)`} />
        {note("n is shouted to the world; φ is kept back — it is the trapdoor.")}
      </g>
    ),
  },

  // 2 — choose e, derive d = e⁻¹ mod φ
  {
    caption: `Choose a PUBLIC exponent e = ${KEY.e} (coprime to φ = ${KEY.phi}). Then derive the PRIVATE exponent d = e⁻¹ mod φ = ${KEY.d} — the modular inverse, which needs φ to compute. Now the pair is complete: the public key is (e = ${KEY.e}, n = ${KEY.n}); the private key is d = ${KEY.d}. Publish the first, guard the second.`,
    render: () => (
      <g>
        <Defs />
        <Heading kicker="RSA · step 3 — the key pair" title="Choose e,  derive d = e⁻¹ mod φ" />
        <ValueTile x={60} y={150} w={180} label="public exponent e" value={String(KEY.e)} tone="public" sub={`coprime to φ=${KEY.phi}`} />
        <OpArrow x1={252} x2={330} y={182} op="e⁻¹ mod φ" formula={`inverse mod ${KEY.phi}`} tone="private" />
        <ValueTile x={344} y={150} w={200} label="private exponent d" value={String(KEY.d)} tone="private" sub={`e·d ≡ 1 (mod ${KEY.phi})`} />
        {/* the two keys, side by side */}
        <g className="rsa-keycard rsa-keycard--pub">
          <rect x={72} y={272} width={244} height={82} rx={11} />
          <Padlock cx={116} cy={314} state="locked" scale={0.72} />
          <text x={168} y={300} className="rsa-keycard-title">
            PUBLIC KEY
          </text>
          <text x={168} y={322} className="rsa-keycard-val">
            (e = {KEY.e},  n = {KEY.n})
          </text>
          <text x={168} y={340} className="rsa-keycard-sub">
            share with everyone
          </text>
        </g>
        <g className="rsa-keycard rsa-keycard--priv">
          <rect x={364} y={272} width={244} height={82} rx={11} />
          <PrivateKey cx={396} cy={314} scale={0.66} />
          <text x={452} y={300} className="rsa-keycard-title">
            PRIVATE KEY
          </text>
          <text x={452} y={322} className="rsa-keycard-val">
            d = {KEY.d}
          </text>
          <text x={452} y={340} className="rsa-keycard-sub">
            keep secret
          </text>
        </g>
        {note(`d needs φ=${KEY.phi} to compute — which needs the primes — which need factoring n. That's the wall.`)}
      </g>
    ),
  },

  // 3 — PUBLIC LOCK: anyone encrypts m=7 → c=13
  {
    caption: `The public lock in action. Anyone — no secret required — takes a message m = ${MSG} and encrypts with the PUBLIC key: c = mᵉ mod n = ${MSG}^${KEY.e} mod ${KEY.n} = ${CIPHER}. That's the padlock snapping shut. The ciphertext ${CIPHER} can travel over an open wire; without the private key it cannot be opened.`,
    render: () => (
      <g>
        <Defs />
        <Heading kicker="RSA · step 4 — encrypt" title="Public lock: anyone can snap it shut" />
        <Actor x={44} y={92} label="anyone" tone="public" />
        <ValueTile x={44} y={168} w={128} label="message m" value={String(MSG)} tone="neutral" />
        <Padlock cx={300} cy={196} state="open" scale={1.05} />
        <OpArrow x1={188} x2={252} y={196} op="lock (public e)" formula={`${MSG}^${KEY.e} mod ${KEY.n}`} tone="public" />
        <OpArrow x1={352} x2={452} y={196} op="" formula="" tone="public" />
        <ValueTile x={468} y={168} w={160} label="ciphertext c" value={String(CIPHER)} tone="public" sub="safe on an open wire" />
        <text x={300} y={286} textAnchor="middle" className="rsa-caption-strong">
          c = mᵉ mod n = {MSG}
          <tspan className="rsa-sup" dy={-6} fontSize={11}>
            {KEY.e}
          </tspan>
          <tspan dy={6}> mod {KEY.n} = </tspan>
          <tspan className="rsa-caption-num">{CIPHER}</tspan>
        </text>
        {note("encryption only uses the PUBLIC (e, n) — that's why anyone can send you a locked message.")}
      </g>
    ),
  },

  // 4 — PRIVATE KEY: only holder decrypts 13 → 7
  {
    caption: `Only the holder of the private key can open it. Decrypt with the PRIVATE exponent d: m = cᵈ mod n = ${CIPHER}^${KEY.d} mod ${KEY.n} = ${PLAIN}. It round-trips exactly back to the original ${MSG}${PLAIN === MSG ? " ✓" : ""}. An eavesdropper holding only c = ${CIPHER} and the public (e = ${KEY.e}, n = ${KEY.n}) is stuck — they'd need d, and deriving d means factoring n.`,
    render: () => (
      <g>
        <Defs />
        <Heading kicker="RSA · step 5 — decrypt" title="Private key: only the holder opens it" />
        <Actor x={44} y={92} label="holder of d" tone="private" />
        <ValueTile x={44} y={168} w={140} label="ciphertext c" value={String(CIPHER)} tone="public" />
        <g className="rsa-unlock-group">
          <Padlock cx={300} cy={196} state="locked" scale={1.05} />
          <PrivateKey cx={286} cy={230} scale={0.62} />
        </g>
        <OpArrow x1={200} x2={252} y={196} op="unlock (private d)" formula={`${CIPHER}^${KEY.d} mod ${KEY.n}`} tone="private" />
        <OpArrow x1={352} x2={456} y={196} op="" formula="" tone="ok" />
        <ValueTile x={472} y={168} w={156} label="recovered m" value={String(PLAIN)} tone="ok" sub={PLAIN === MSG ? "= original ✓" : "mismatch"} />
        <text x={300} y={300} textAnchor="middle" className="rsa-caption-strong">
          m = cᵈ mod n = {CIPHER}
          <tspan className="rsa-sup" dy={-6} fontSize={11}>
            {KEY.d}
          </tspan>
          <tspan dy={6}> mod {KEY.n} = </tspan>
          <tspan className="rsa-caption-ok">{PLAIN}</tspan>
        </text>
        {note("an eavesdropper with only c and the public key can't derive d without factoring n.")}
      </g>
    ),
  },

  // 5 — SIGNATURE: run it backwards — sign with d, verify with e
  {
    caption: `Run the machine backwards and it proves authorship. The holder SIGNS with the private key: s = mᵈ mod n = ${MSG}^${KEY.d} mod ${KEY.n} = ${SIG}. Anyone VERIFIES with the public key: sᵉ mod n = ${SIG}^${KEY.e} mod ${KEY.n} = ${VERIFIED}, which matches m = ${MSG}${VERIFIED === MSG ? " ✓" : ""}. Encrypt/decrypt swaps to sign/verify — same trapdoor, opposite direction: only the private holder could have produced a signature the public key undoes.`,
    render: () => (
      <g>
        <Defs />
        <Heading kicker="RSA · step 6 — sign & verify" title="Backwards: sign with private, verify with public" />
        {/* sign lane */}
        <Actor x={44} y={96} label="holder signs" tone="private" />
        <ValueTile x={44} y={134} w={120} label="message m" value={String(MSG)} tone="neutral" />
        <OpArrow x1={172} x2={244} y={162} op="sign (private d)" formula={`${MSG}^${KEY.d} mod ${KEY.n}`} tone="private" />
        <ValueTile x={260} y={134} w={130} label="signature s" value={String(SIG)} tone="private" />
        <OpArrow x1={398} x2={470} y={162} op="verify (public e)" formula={`${SIG}^${KEY.e} mod ${KEY.n}`} tone="ok" />
        <ValueTile x={486} y={134} w={144} label="recovered" value={String(VERIFIED)} tone="ok" sub={VERIFIED === MSG ? `= m (${MSG}) ✓` : "mismatch"} />
        {/* verdict banner */}
        <g className={VERIFIED === MSG ? "rsa-verdict rsa-verdict--ok" : "rsa-verdict"}>
          <rect x={132} y={262} width={416} height={70} rx={12} />
          <text x={340} y={288} textAnchor="middle" className="rsa-verdict-title">
            {VERIFIED === MSG ? "Signature valid — authorship proven" : "Signature invalid"}
          </text>
          <text x={340} y={312} textAnchor="middle" className="rsa-verdict-sub">
            only d could make an s that e undoes back to {MSG}
          </text>
        </g>
        {note("same key pair, roles reversed: private ⇒ authorship, public ⇒ anyone can check.")}
      </g>
    ),
  },
];

export default function RsaLocks(): ReactNode {
  return (
    <FigureStepper
      title="RSA — the public padlock and the private key"
      figKey="rsa-locks"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
