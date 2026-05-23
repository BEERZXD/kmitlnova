import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const gradeView = readFileSync(new URL('./components/GradeView.tsx', import.meta.url), 'utf8');
const studyView = readFileSync(new URL('./components/StudyView.tsx', import.meta.url), 'utf8');
const examView = readFileSync(new URL('./components/ExamView.tsx', import.meta.url), 'utf8');

function cssRule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*{([^}]*)}`))?.[1] ?? '';
}

describe('report styling contracts', () => {
  it('keeps timetable blocks and grade notes center aligned', () => {
    expect(cssRule('.kpm-block')).toContain('align-items: center');
    expect(cssRule('.kpm-block')).toContain('text-align: center');
    expect(cssRule('.kpm-block-name')).toContain('width: 100%');
    expect(cssRule('.kpm-block-meta')).toContain('width: 100%');
    expect(cssRule('.kpm-block-room')).toContain('width: 100%');
    expect(cssRule('.kpm-block-room')).toContain('margin-top: 0');
    expect(cssRule('.kpm-legend')).toContain('text-align: center');
    expect(cssRule('.kpm-tba-item')).toContain('align-items: center');
    expect(cssRule('.kpm-tba-item')).toContain('text-align: center');
    expect(cssRule('.kpm-tba-reason')).toContain('margin-top: 0');
    expect(cssRule('.kpm-block-name')).toContain('text-align: center');
    expect(cssRule('.kpm-block-meta')).toContain('text-align: center');
    expect(cssRule('.kpm-block-room')).toContain('text-align: center');
  });

  it('renders the Pro Max grade legend with colored X marks on one line', () => {
    expect(gradeView).toContain('kpm-legend-primary');
    expect(gradeView).toContain('kpm-legend-mark published');
    expect(gradeView).toContain('kpm-legend-mark unpublished');
    expect(gradeView).toContain('หมายเหตุ:');
    expect(gradeView).toContain('X</span> = ประกาศเกรดแล้ว');
    expect(gradeView).toContain('X</span> = ยังไม่ประกาศเกรด');
    expect(gradeView).toContain('สาเหตุที่เกรดเป็น X เนื่องจากนักศึกษาประเมินการสอนไม่ครบทุกวิชา จะส่งผลต่อ 1 เทอม หากเทอมต่อไปประเมินการสอนครบ ก็จะสามารถเห็นเกรดได้ตามปกติ');
    expect(gradeView).toContain('หากต้องการทราบเกรด สามารถขอเอกสาร Transcript ได้ที่สำนักทะเบียนฯ ตามช่องทางที่กำหนด');
    expect(gradeView).toContain('ผลการเรียนที่ไม่ผ่านหรือได้เกรด F จะแสดงตามปกติ');
    expect(cssRule('.kpm-legend-primary')).toContain('white-space: nowrap');
    expect(cssRule('.kpm-legend-mark.published')).toContain('#10b981');
    expect(cssRule('.kpm-legend-mark.unpublished')).toContain('#ef4444');
    expect(cssRule('.kpm-summary-cumulation .kpm-summary-title')).toContain('#1e3a8a');
    expect(cssRule('.kpm-summary-cumulation .kpm-summary-gpa')).toContain('font-size: 18px');
    expect(cssRule('.kpm-summary-cumulation .kpm-summary-gpa')).toContain('#2563eb');
  });

  it('uses the same Thai-only title-card style for grade results', () => {
    expect(gradeView).toContain("const gradeTitle = 'ผลการเรียน';");
    expect(gradeView).not.toContain('ผลการเรียน (Grades)');
  });

  it('defines phone and iPad responsive breakpoints', () => {
    expect(css).toContain('@media (max-width: 639px)');
    expect(css).toContain('@media (min-width: 640px) and (max-width: 1023px)');
  });

  it('keeps timetable scrolling scoped away from title and TBA surfaces', () => {
    expect(cssRule('.kpm-container')).not.toContain('overflow-x: auto');
    expect(cssRule('.kpm-scroll-surface')).toContain('overflow-x: auto');
    expect(cssRule('.kpm-scroll-surface')).toContain('-webkit-overflow-scrolling: touch');
    expect(cssRule('.kpm-scroll-surface')).not.toContain('scrollbar-gutter: stable');
    expect(cssRule('.kpm-grid')).toContain('min-width');
    expect(studyView).toContain('className="kpm-scroll-surface"');
    expect(examView).toContain('className="kpm-scroll-surface"');

    const tableContainerRule = css.match(/\.kpm-grade-container,\s*\.kpm-summary-container\s*{([^}]*)}/)?.[1] ?? '';
    expect(tableContainerRule).toContain('overflow-x: auto');
    expect(tableContainerRule).toContain('-webkit-overflow-scrolling: touch');
  });

  it('defines a desktop-only export layout override', () => {
    expect(cssRule('.export-target.export-desktop')).toContain('width: 1400px');
    expect(cssRule('.export-target.export-desktop')).toContain('max-width: none');
    expect(cssRule('.export-target.export-desktop')).toContain('overflow: visible');
    expect(cssRule('.export-target.export-desktop .kpm-scroll-surface')).toContain('overflow: visible');
    expect(cssRule('.export-target.export-desktop .kpm-info-card')).toContain('padding: 28px 32px');
    expect(cssRule('.export-target.export-desktop .kpm-tba-list')).toContain('repeat(auto-fill, minmax(300px, 1fr))');
  });
});
