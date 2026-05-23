import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ExamReport } from '../types';
import { examKindLabel, formatExamDateLabel, selectedExamKind, subjectPalette } from '../reportDisplay';
import { ReportTitleCard } from './ReportTitleCard';

const title = 'ตารางสอบ';
const tbaTitle = 'รายวิชาที่ไม่ระบุตารางสอบ';

function range(exams: ExamReport['exams']) {
  const scheduled = exams.filter((exam) => !exam.isTba);
  if (!scheduled.length) return { start: 8 * 60, end: 18 * 60 };
  return {
    start: Math.floor(Math.min(...scheduled.map((exam) => exam.startMinutes)) / 60) * 60,
    end: Math.ceil(Math.max(...scheduled.map((exam) => exam.endMinutes)) / 60) * 60,
  };
}

function timeLabel(minutes: number) {
  return `${String(minutes / 60).padStart(2, '0')}:00`;
}

export function ExamView({ report }: { report: ExamReport }) {
  const scheduled = report.exams.filter((exam) => !exam.isTba).sort((a, b) => a.sortKey - b.sortKey || a.startMinutes - b.startMinutes);
  const tba = report.exams.filter((exam) => exam.isTba);
  const dates = [...new Set(scheduled.map((exam) => exam.dateRaw))];
  const selectedKind = selectedExamKind(report.options?.examKinds);
  const themes = useMemo(() => {
    const map = new Map<string, { accent: string; bg: string; text: string }>();
    [...scheduled, ...tba].forEach((exam) => {
      if (map.has(exam.code)) return;
      const [accent, bg, text] = subjectPalette[map.size % subjectPalette.length];
      map.set(exam.code, { accent, bg, text });
    });
    return map;
  }, [scheduled, tba]);
  const timeRange = range(report.exams);
  const totalSlots = Math.max(1, (timeRange.end - timeRange.start) / 15);
  const hours = Array.from({ length: Math.max(1, (timeRange.end - timeRange.start) / 60) }, (_, index) => timeRange.start + index * 60);

  return (
    <section className="kpm-container export-target">
      <ReportTitleCard
        title={title}
        student={report.student}
        extra={selectedKind ? <div className="kpm-info-row">{examKindLabel(selectedKind)}</div> : null}
      />

      {scheduled.length ? (
        <div className="kpm-scroll-surface">
          <div
            className="kpm-grid kpm-exam-grid"
            style={{
              gridTemplateColumns: `120px repeat(${totalSlots}, 1fr)`,
              gridTemplateRows: `auto repeat(${dates.length}, auto)`,
            }}
          >
          <div className="kpm-corner" />
          {hours.map((hour) => (
            <div key={hour} className="kpm-time-header" style={{ gridColumn: 'span 4' }}>
              {timeLabel(hour)}
            </div>
          ))}

          {dates.map((date, dateIndex) => {
            const row = dateIndex + 2;
            const dateLabel = formatExamDateLabel(date);
            return (
              <div key={date} className="kpm-row-fragment">
                <div className="kpm-day-label" style={{ gridRow: row, gridColumn: 1 }}>
                  <span className="kpm-day-short kpm-exam-date">{dateLabel.date}</span>
                  {dateLabel.day ? <span className="kpm-day-full">{dateLabel.day}</span> : null}
                </div>
                {Array.from({ length: totalSlots }, (_, slotIndex) => (
                  <div
                    key={`${date}-${slotIndex}`}
                    className={slotIndex % 4 === 0 ? 'kpm-bg-cell kpm-hour-start' : 'kpm-bg-cell'}
                    style={{ gridRow: row, gridColumn: slotIndex + 2 }}
                  />
                ))}
                {scheduled
                  .filter((exam) => exam.dateRaw === date)
                  .map((exam) => {
                    const theme = themes.get(exam.code) ?? { accent: '#64748b', bg: '#f8fafc', text: '#0f172a' };
                    const startCol = Math.floor((exam.startMinutes - timeRange.start) / 15) + 2;
                    const endCol = Math.ceil((exam.endMinutes - timeRange.start) / 15) + 2;

                    return (
                      <article
                        key={`${exam.code}-${exam.dateRaw}-${exam.start}-${exam.end}`}
                        className="kpm-block"
                        style={{
                          gridRow: row,
                          gridColumn: `${startCol} / ${Math.max(startCol + 1, endCol)}`,
                          '--accent': theme.accent,
                          '--bg': theme.bg,
                          '--text': theme.text,
                        } as CSSProperties}
                      >
                        <div className="kpm-block-name">{exam.name}</div>
                        <div className="kpm-block-meta">Sec {exam.section || '-'} ({exam.type}) · {exam.start}-{exam.end}</div>
                        {exam.location ? <div className="kpm-block-room">{exam.location}</div> : null}
                      </article>
                    );
                  })}
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="kpm-empty">No scheduled exams found for this selection.</div>
      )}

      {tba.length ? (
        <section className="kpm-tba-container">
          <h3 className="kpm-tba-title">{tbaTitle}</h3>
          <div className="kpm-tba-list">
            {tba.map((exam) => {
              const theme = themes.get(exam.code) ?? { accent: '#64748b', bg: '#f8fafc', text: '#0f172a' };
              return (
                <article
                  key={`${exam.code}-${exam.section}-${exam.type}`}
                  className="kpm-tba-item"
                  style={{
                    '--accent': theme.accent,
                    '--bg': theme.bg,
                    '--text': theme.text,
                  } as CSSProperties}
                >
                  <div className="kpm-tba-code">{exam.code} <span className="kpm-tba-meta">· Sec {exam.section || '-'} ({exam.type})</span></div>
                  <div className="kpm-tba-name">{exam.name}</div>
                  <div className="kpm-tba-reason">{exam.reason || exam.location || 'TBA'}</div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
