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
  const detailParts = [formatSemesterLabel(displayStudent.semester), studentText].filter(Boolean);

  return (
    <div className="kpm-info-card">
      <div className="kpm-info-title">{title}</div>
      <div className="kpm-info-university">{displayStudent.university || UNIVERSITY_TH}</div>
      <div className={`kpm-info-row${orgParts.length ? '' : ' kpm-info-row-empty'}`} aria-hidden={orgParts.length ? undefined : true}>
        {orgParts.map((part) => (
          <span key={part}>{part}</span>
        ))}
      </div>
      <div className="kpm-info-details">
        {detailParts.map((part) => (
          <span className="kpm-info-details-item" key={part}>{part}</span>
        ))}
      </div>
      {extra}
    </div>
  );
}
