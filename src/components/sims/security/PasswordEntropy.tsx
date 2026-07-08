// [micro] password-entropy (ch.32) — turns a password into an entropy estimate
// and a crack-time across realistic attacker rates, and exposes the trap: naive
// "ideal bits" assume the password is RANDOM. "P@ssw0rd" scores ~53 bits by
// charset math yet dies instantly to a wordlist, because it's a leetspeak
// dictionary word. Purely reactive: type a password (or tap a preset) and
// `assess(pw)` recomputes via useMemo — the meter, the dictionary warning and
// the crack table all come straight from passwords.ts. Prefix: pw-.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { assess } from "./passwords.ts";
import type { Band, PasswordReport } from "./passwords.ts";
import "../../../theme/_p9css/password-entropy.css";

const ACCENT = "#818CF8";

const DEFAULT_PW = "P@ssw0rd";

// A few presets that tell the story: a word, a leet word, and a real random one.
const PRESETS: readonly { label: string; pw: string; note: string }[] = [
  { label: "password", pw: "password", note: "raw dictionary word" },
  { label: "P@ssw0rd", pw: "P@ssw0rd", note: "leetspeak word — looks strong, isn't" },
  { label: "Monkey1", pw: "Monkey1", note: "word + trailing digit" },
  { label: "correct-horse-4-staple", pw: "correct-horse-4-staple", note: "long passphrase" },
  { label: "random 12", pw: "x9$Qm2!vTz7#", note: "12 truly-random characters" },
];

// The five bands → a 0…4 fill and a semantic color ramp.
const BAND_ORDER: readonly Band[] = ["very weak", "weak", "reasonable", "strong", "very strong"];
const BAND_VAR: Record<Band, string> = {
  "very weak": "var(--sem-err)",
  weak: "var(--sem-control)",
  reasonable: "var(--sem-data)",
  strong: "var(--accent)",
  "very strong": "var(--sem-ok)",
};

const CLASS_HINT: Record<string, string> = {
  lowercase: "a–z (+26)",
  uppercase: "A–Z (+26)",
  digits: "0–9 (+10)",
  symbols: "!@#… (+33)",
};

export default function PasswordEntropy() {
  const [pw, setPw] = useState(DEFAULT_PW);
  const report = useMemo<PasswordReport>(() => assess(pw), [pw]);

  function onReset(): void {
    setPw(DEFAULT_PW);
  }

  const bandIdx = BAND_ORDER.indexOf(report.band);
  const bandColor = BAND_VAR[report.band];
  const fillPct = report.length === 0 ? 0 : ((bandIdx + 1) / BAND_ORDER.length) * 100;

  const status =
    report.length === 0
      ? "empty password"
      : `${report.idealBits.toFixed(1)} ideal bits · ${report.band}` +
        (report.dict.hit ? ` · in wordlist (${report.dict.base})` : "");

  return (
    <SimShell
      title="Password entropy — why naive bits lie"
      simKey="password-entropy"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="pw-ctl" role="group" aria-label="Try a preset password">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={cx("btn", "pw-preset", pw === p.pw && "btn-primary")}
              onClick={() => setPw(p.pw)}
              aria-pressed={pw === p.pw}
              title={p.note}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="pw-stage">
        <label className="pw-input-field">
          <span className="pw-input-lbl">password (shown in plain text — it's a demo)</span>
          <input
            className="pw-input"
            type="text"
            value={pw}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            onChange={(e) => setPw(e.target.value)}
            aria-label="Password to assess, shown in plain text"
            placeholder="type a password…"
          />
          <span className="pw-len" aria-hidden={report.length === 0}>
            {report.length} chars
          </span>
        </label>

        {/* character classes + charset pool */}
        <div className="pw-classes-panel">
          <span className="pw-panel-h">character classes present</span>
          <div className="pw-classes" role="list" aria-label="Character classes present">
            {(["lowercase", "uppercase", "digits", "symbols"] as const).map((c) => {
              const on = report.charset.classes.includes(c);
              return (
                <span key={c} role="listitem" className={cx("pw-class", on && "on")}>
                  <span className="pw-class-dot" aria-hidden="true" />
                  <span className="pw-class-name">{c}</span>
                  <span className="pw-class-hint">{CLASS_HINT[c]}</span>
                </span>
              );
            })}
          </div>
          <p className="pw-charset">
            charset pool <b>{report.charset.size}</b> symbols → ideal entropy{" "}
            <b>{report.length}</b> × log₂({report.charset.size || 0}) ={" "}
            <b className="pw-bits">{report.idealBits.toFixed(1)} bits</b>
          </p>
        </div>

        {/* strength meter, colored by band */}
        <div className="pw-meter-panel">
          <div className="pw-meter-top">
            <span className="pw-panel-h">strength (by ideal bits)</span>
            <span className="pw-band" style={{ color: bandColor }}>
              {report.length === 0 ? "—" : report.band}
            </span>
          </div>
          <div
            className="pw-meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={BAND_ORDER.length}
            aria-valuenow={report.length === 0 ? 0 : bandIdx + 1}
            aria-valuetext={report.length === 0 ? "empty" : report.band}
            aria-label="Password strength"
          >
            <div className="pw-meter-fill" style={{ width: `${fillPct}%`, background: bandColor }} />
            <div className="pw-meter-ticks" aria-hidden="true">
              {BAND_ORDER.slice(0, -1).map((b) => (
                <span key={b} className="pw-meter-tick" />
              ))}
            </div>
          </div>
          <div className="pw-band-scale" aria-hidden="true">
            {BAND_ORDER.map((b, i) => (
              <span key={b} className={cx("pw-band-scale-lbl", i === bandIdx && report.length > 0 && "on")}>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* dictionary reality — the honest verdict */}
        {report.dict.hit && (
          <div className="pw-dictwarn" role="alert">
            <span className="pw-dictwarn-icon" aria-hidden="true">
              ⚠
            </span>
            <div className="pw-dictwarn-body">
              <b>In the wordlist (base: {report.dict.base})</b> — cracked instantly. Those{" "}
              {report.idealBits.toFixed(1)} ideal bits are a lie: entropy math assumes random
              characters, but a known word is one guess down a list.
            </div>
          </div>
        )}

        {/* crack-time across attacker scenarios */}
        <div className="pw-crack-panel">
          <span className="pw-panel-h">
            estimated crack time {report.dict.hit ? "(wordlist reality — ~2²¹ guesses)" : "(average = ½ keyspace)"}
          </span>
          <table className="pw-crack-table">
            <thead>
              <tr>
                <th scope="col">attacker scenario</th>
                <th scope="col" className="pw-crack-time-h">
                  time to crack
                </th>
              </tr>
            </thead>
            <tbody>
              {report.crack.map((c) => {
                const instant = c.seconds < 1;
                const long = c.seconds >= 3600 * 24 * 365.25 * 100; // ≥ ~century
                return (
                  <tr key={c.id} className={cx(instant && "is-instant", long && "is-long")}>
                    <td className="pw-crack-scn">{c.label}</td>
                    <td
                      className="pw-crack-time"
                      style={{
                        color: instant ? "var(--sem-err)" : long ? "var(--sem-ok)" : "var(--tx)",
                      }}
                    >
                      {c.time}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="pw-lesson">
            Same bits, wildly different reality: a fast hash or a dictionary hit collapses “strong”
            to instant. Length + true randomness + a slow hash (bcrypt/Argon2id) is what actually
            buys time.
          </p>
        </div>
      </div>
    </SimShell>
  );
}
