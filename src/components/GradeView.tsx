import { useMemo } from 'react';
import type { GradeReport } from '../types';
import { subjectPalette } from '../reportDisplay';
import { ReportTitleCard } from './ReportTitleCard';

const gradeTitle = 'ผลการเรียน';

function gradeColor(grade: string) {
  const normalized = grade.trim().toUpperCase();
  if (normalized === 'A') return '#10b981';
  if (normalized === 'B+' || normalized === 'B') return '#3b82f6';
  if (normalized === 'C+' || normalized === 'C') return '#f59e0b';
  if (normalized === 'D+' || normalized === 'D') return '#f97316';
  if (normalized === 'F' || normalized === 'U') return '#ef4444';
  if (normalized === 'S') return '#8b5cf6';
  if (normalized.includes('X')) return '#6b7280';
  return '#6b7280';
}

export function GradeView({ report }: { report: GradeReport }) {
  const courseColors = useMemo(() => {
    const map = new Map<string, string>();
    report.courses.forEach((course) => {
      if (map.has(course.code)) return;
      map.set(course.code, subjectPalette[map.size % subjectPalette.length][0]);
    });
    return map;
  }, [report.courses]);

  return (
    <section className="kpm-container export-target">
      <ReportTitleCard title={gradeTitle} student={report.student} />

      {report.courses.length ? (
        <div className="kpm-grade-container">
          <table className="kpm-grade-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Course No.</th>
                <th className="kpm-grade-title">Course Title</th>
                <th>Section</th>
                <th>Credit</th>
                <th>Type</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {report.courses.map((course, index) => (
                <tr key={`${course.no}-${course.code}`}>
                  <td>{index + 1}</td>
                  <td className="kpm-grade-code" style={{ color: courseColors.get(course.code) }}>{course.code}</td>
                  <td className="kpm-grade-title">{course.name}</td>
                  <td>{course.section}</td>
                  <td>{course.credit}</td>
                  <td>{course.type}</td>
                  <td className="kpm-grade-value" style={{ color: gradeColor(course.grade) }}>{course.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kpm-empty">No grade rows found for this selection.</div>
      )}

      {report.summary.length ? (
        <div className="kpm-summary-container">
          <table className="kpm-summary-table">
            <thead>
              <tr>
                <th />
                <th>CA</th>
                <th>CP</th>
                <th>CD</th>
                <th>GP</th>
                <th>GPS/GPA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.summary.map((item) => (
                <tr key={item.title} className={item.title === 'Cumulation' ? 'kpm-summary-cumulation' : ''}>
                  <td className="kpm-summary-title">{item.title}</td>
                  <td>{item.ca}</td>
                  <td>{item.cp}</td>
                  <td>{item.cd}</td>
                  <td>{item.gp}</td>
                  <td className="kpm-summary-gpa">{item.gpa}</td>
                  <td className={item.status.toLowerCase().includes('pass') ? 'kpm-status pass' : 'kpm-status'}>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="kpm-legend">
        <div>หมายเหตุ:</div>
        <div className="kpm-legend-primary">
          <span className="kpm-legend-mark published">X</span> = ประกาศเกรดแล้ว
          {'   |   '}
          <span className="kpm-legend-mark unpublished">X</span> = ยังไม่ประกาศเกรด
        </div>
        <div>สาเหตุที่เกรดเป็น X เนื่องจากนักศึกษาประเมินการสอนไม่ครบทุกวิชา จะส่งผลต่อ 1 เทอม หากเทอมต่อไปประเมินการสอนครบ ก็จะสามารถเห็นเกรดได้ตามปกติ</div>
        <div>หากต้องการทราบเกรด สามารถขอเอกสาร Transcript ได้ที่สำนักทะเบียนฯ ตามช่องทางที่กำหนด</div>
        <div>ผลการเรียนที่ไม่ผ่านหรือได้เกรด F จะแสดงตามปกติ</div>
      </div>
    </section>
  );
}
