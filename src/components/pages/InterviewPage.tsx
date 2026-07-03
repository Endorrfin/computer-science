import { INTERVIEW } from "../../data/interview.ts";
import { chapterById } from "../../data/curriculum.ts";
import { Md } from "../../lib/md.tsx";
import { cx } from "../../lib/utils.ts";

export default function InterviewPage() {
  const chapterIds = [...new Set(INTERVIEW.map((q) => q.chapterId))];
  return (
    <div className="container pagestub">
      <h1>Interview bank</h1>
      <p className="muted">
        Senior-grade CS questions, tagged by chapter. The bank grows every session (~60 questions
        by S18, with filters). Current count: <strong>{INTERVIEW.length}</strong>.
      </p>
      {chapterIds.map((cid) => {
        const ch = chapterById(cid);
        return (
          <section key={cid} className="iv-group">
            <h2>
              <a href={`#/chapter/${cid}`}>{ch ? ch.title : cid}</a>
            </h2>
            {INTERVIEW.filter((q) => q.chapterId === cid).map((q) => (
              <details key={q.id} className="iv-q">
                <summary>
                  <span className={cx("chip", `level-${q.level}`)}>{q.level}</span> {q.q}
                </summary>
                <div className="iv-a">
                  <Md md={q.a} />
                </div>
              </details>
            ))}
          </section>
        );
      })}
    </div>
  );
}
