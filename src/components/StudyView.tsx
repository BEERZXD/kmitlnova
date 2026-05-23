import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { StudyReport } from '../types';
import { studyDayLabel, studyDayOrder, subjectPalette } from '../reportDisplay';
import { ReportTitleCard } from './ReportTitleCard';

const title = 'ตารางเรียน';
const theoryLabel = 'ทฤษฎี';
const practiceLabel = 'ปฏิบัติ';

function range(report: StudyReport) {
  const slots = report.courses.flatMap((course) => course.slots);
  if (!slots.length) return { start: 8 * 60, end: 18 * 60 };
  return {
    start: Math.floor(Math.min(...slots.map((slot) => slot.startMinutes)) / 60) * 60,
    end: Math.ceil(Math.max(...slots.map((slot) => slot.endMinutes)) / 60) * 60,
  };
}

function timeLabel(minutes: number) {
  return `${String(minutes / 60).padStart(2, '0')}:00`;
}

export function StudyView({ report }: { report: StudyReport }) {
  const themes = useMemo(() => {
    const map = new Map<string, { accent: string; bg: string; text: string }>();
    report.courses.forEach((course) => {
      if (map.has(course.code)) return;
      const [accent, bg, text] = subjectPalette[map.size % subjectPalette.length];
      map.set(course.code, { accent, bg, text });
    });
    return map;
  }, [report.courses]);
  const usedDays = new Set(report.courses.flatMap((course) => course.slots.map((slot) => studyDayLabel(slot.day).key)));
  const days = studyDayOrder.filter((day) => usedDays.has(day));
  const timeRange = range(report);
  const totalSlots = Math.max(1, (timeRange.end - timeRange.start) / 15);
  const hours = Array.from({ length: Math.max(1, (timeRange.end - timeRange.start) / 60) }, (_, index) => timeRange.start + index * 60);

  return (
    <section className="kpm-container export-target">
      <ReportTitleCard title={title} student={report.student} />

      {!report.courses.length || !days.length ? (
        <div className="kpm-empty">No registered courses found for this semester.</div>
      ) : (
        <div className="kpm-scroll-surface">
          <div
            className="kpm-grid"
            style={{
              gridTemplateColumns: `120px repeat(${totalSlots}, 1fr)`,
              gridTemplateRows: `auto repeat(${days.length}, 1fr)`,
            }}
          >
          <div className="kpm-corner" />
          {hours.map((hour) => (
            <div key={hour} className="kpm-time-header" style={{ gridColumn: 'span 4' }}>
              {timeLabel(hour)}
            </div>
          ))}

          {days.map((day, dayIndex) => {
            const row = dayIndex + 2;
            const label = studyDayLabel(day);
            return (
              <div key={day} className="kpm-row-fragment">
                <div className="kpm-day-label" style={{ gridRow: row, gridColumn: 1 }}>
                  <span className="kpm-day-short">{label.short}</span>
                  <span className="kpm-day-full">{label.full}</span>
                </div>
                {Array.from({ length: totalSlots }, (_, slotIndex) => (
                  <div
                    key={`${day}-${slotIndex}`}
                    className={slotIndex % 4 === 0 ? 'kpm-bg-cell kpm-hour-start' : 'kpm-bg-cell'}
                    style={{ gridRow: row, gridColumn: slotIndex + 2 }}
                  />
                ))}
                {report.courses.flatMap((course) =>
                  course.slots
                    .filter((slot) => studyDayLabel(slot.day).key === day)
                    .map((slot) => {
                      const theme = themes.get(course.code) ?? { accent: '#64748b', bg: '#f8fafc', text: '#0f172a' };
                      const startCol = Math.floor((slot.startMinutes - timeRange.start) / 15) + 2;
                      const endCol = Math.ceil((slot.endMinutes - timeRange.start) / 15) + 2;
                      const section = slot.isPractice ? course.practiceSection : course.theorySection;
                      const sectionType = slot.isPractice ? practiceLabel : theoryLabel;

                      return (
                        <article
                          key={`${course.code}-${slot.day}-${slot.start}-${slot.end}`}
                          className="kpm-block"
                          style={{
                            gridRow: row,
                            gridColumn: `${startCol} / ${Math.max(startCol + 1, endCol)}`,
                            '--accent': theme.accent,
                            '--bg': theme.bg,
                            '--text': theme.text,
                          } as CSSProperties}
                        >
                          <div className="kpm-block-name">{course.name}</div>
                          <div className="kpm-block-meta">Section {section || '-'} ({sectionType}) · {slot.start}-{slot.end}</div>
                          {slot.room || course.building ? <div className="kpm-block-room">{slot.room || course.building}</div> : null}
                        </article>
                      );
                    }),
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}
    </section>
  );
}
