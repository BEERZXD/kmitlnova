import type { ReactNode } from 'react';
import type { StudentInfo } from '../types';
import { formatSemesterLabel, normalizeTitleCardStudent, UNIVERSITY_TH } from '../reportDisplay';

type ReportTitleCardProps = {
  title: string;
  student: StudentInfo;
  extra?: ReactNode;
};

export function ReportTitleCard({ title, student, extra }: ReportTitleCardProps) {
  const displayStudent = normalizeTitleCardStudent(student);
  const studentText = [displayStudent.id, displayStudent.name].filter(Boolean).join(' - ');
  const orgParts = [displayStudent.faculty, displayStudent.department].filter(Boolean);

  return (
    <div className="kpm-info-card">
      <div className="kpm-info-title">{title}</div>
      <div className="kpm-info-university">{displayStudent.university || UNIVERSITY_TH}</div>
      {orgParts.length ? (
        <div className="kpm-info-row">
          {orgParts.map((part, index) => (
            <span key={part}>
              {index ? <span className="kpm-info-divider">·</span> : null}
              {part}
            </span>
          ))}
        </div>
      ) : null}
      <div className="kpm-info-details">
        <span>{formatSemesterLabel(displayStudent.semester)}</span>
        {studentText ? <span className="kpm-info-divider">·</span> : null}
        {studentText ? <span>{studentText}</span> : null}
      </div>
      {extra}
    </div>
  );
}
