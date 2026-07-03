// PredictQuiz — the shared predict-the-behavior widget (§6): commit an
// answer BEFORE seeing the truth, then get the explanation. Commitment is
// what makes prediction stick; answers persist in localStorage.
import { useState } from "react";
import type { CSSProperties } from "react";
import type { QuizDef } from "../../lib/types.ts";
import { clearQuiz, useQuizAnswers } from "../../lib/progress.ts";
import { Md, renderInline } from "../../lib/md.tsx";
import { cx } from "../../lib/utils.ts";

export default function PredictQuiz({ quiz, accent }: { quiz: QuizDef; accent?: string }) {
  const [committed, commit] = useQuizAnswers(quiz.id);
  const [draft, setDraft] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const revealed = committed !== undefined;
  const allPicked = draft.every((d) => d !== null);
  const score = revealed
    ? quiz.questions.reduce((n, q, i) => n + (committed[i] === q.answer ? 1 : 0), 0)
    : 0;

  return (
    <section
      className="quiz"
      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
      aria-label="Predict the behavior quiz"
    >
      <div className="quiz-head">
        <span className="quiz-tag">predict</span>
        <span className="quiz-title">Commit your prediction, then see the truth</span>
        {revealed && (
          <span className={cx("quiz-score", score === quiz.questions.length && "perfect")}>
            {score} / {quiz.questions.length}
          </span>
        )}
      </div>

      {quiz.questions.map((q, qi) => {
        const picked = revealed ? committed[qi] : draft[qi];
        return (
          <fieldset key={qi} className="quiz-q">
            <legend className="quiz-prompt">
              <span className="quiz-num">{qi + 1}</span>
              <Md md={q.prompt} />
            </legend>
            <div className="quiz-opts" role="radiogroup">
              {q.options.map((opt, oi) => {
                const isPick = picked === oi;
                const isAnswer = revealed && oi === q.answer;
                const isWrongPick = revealed && isPick && oi !== q.answer;
                return (
                  <label key={oi} className={cx("quiz-opt", isPick && "picked", isAnswer && "correct", isWrongPick && "wrong")}>
                    <input
                      type="radio"
                      name={`${quiz.id}-${qi}`}
                      checked={isPick}
                      disabled={revealed}
                      onChange={() =>
                        setDraft((d) => d.map((v, i) => (i === qi ? oi : v)))
                      }
                    />
                    <span>{renderInline(opt)}</span>
                    {isAnswer && <span className="quiz-mark" aria-label="correct answer">✓</span>}
                    {isWrongPick && <span className="quiz-mark" aria-label="your incorrect pick">✗</span>}
                  </label>
                );
              })}
            </div>
            {revealed && (
              <div className="quiz-explain" aria-live="polite">
                <Md md={q.explain} />
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="quiz-actions">
        {!revealed ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allPicked}
            onClick={() => commit(draft.map((d) => d ?? 0))}
          >
            {allPicked ? "Commit & reveal" : "Answer every question to commit"}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraft(quiz.questions.map(() => null));
              clearQuiz(quiz.id);
            }}
          >
            ↺ retake
          </button>
        )}
      </div>
    </section>
  );
}
