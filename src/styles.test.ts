import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const appShell = readFileSync(new URL('./components/AppShell.tsx', import.meta.url), 'utf8');
const gradeView = readFileSync(new URL('./components/GradeView.tsx', import.meta.url), 'utf8');
const loginView = readFileSync(new URL('./components/LoginView.tsx', import.meta.url), 'utf8');
const reportTitleCard = readFileSync(new URL('./components/ReportTitleCard.tsx', import.meta.url), 'utf8');
const studyView = readFileSync(new URL('./components/StudyView.tsx', import.meta.url), 'utf8');
const examView = readFileSync(new URL('./components/ExamView.tsx', import.meta.url), 'utf8');
const loginImagesFile = new URL('../public/login-images.txt', import.meta.url);
const serverApp = readFileSync(new URL('../server/app.js', import.meta.url), 'utf8');
const vercelConfig = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');

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
    expect(studyView).toContain('kpm-block-short');
    expect(cssRule('.kpm-block-short')).toContain('padding: 7px 8px');
    expect(cssRule('.kpm-block-short .kpm-block-meta')).toContain('-webkit-line-clamp: 2');
    expect(cssRule('.kpm-block-short .kpm-block-meta')).not.toContain('white-space: nowrap');
    expect(cssRule('.kpm-block-short:is(:hover, :focus-visible, :active)')).toContain('width: max(100%, 260px)');
    expect(cssRule('.kpm-block-short:is(:hover, :focus-visible, :active) .kpm-block-name')).toContain('-webkit-line-clamp: unset');
    expect(cssRule('.kpm-block-short:is(:hover, :focus-visible, :active) .kpm-block-meta')).toContain('-webkit-line-clamp: unset');
    expect(studyView).toContain('tabIndex={isShortSlot ? 0 : undefined}');
    expect(studyView).toContain('aria-label={slotLabel}');
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
    expect(css).toContain('min-width: 1320px');
    expect(css).toContain('min-width: 1360px');
    expect(css).toContain('min-height: 96px');
    expect(css).toContain('min-height: 104px');
    expect(css).toContain('.kpm-block-short .kpm-block-name');
    expect(css).toContain('-webkit-line-clamp: 3');
    expect(css).toContain('.kpm-block-short:is(:hover, :focus-visible, :active)');
  });

  it('uses Thai copy for empty exam schedules', () => {
    expect(examView).toContain('ไม่พบตารางสอบในภาคการศึกษานี้');
    expect(examView).not.toContain('No scheduled exams found for this selection.');
  });

  it('uses Thai copy for empty study timetables', () => {
    expect(studyView).toContain('ไม่พบตารางเรียนในภาคการศึกษานี้');
    expect(studyView).not.toContain('No registered courses found for this semester.');
  });

  it('keeps authenticated mobile header and selectors compact', () => {
    expect(appShell).toContain('<p>ระบบดึงข้อมูลการเรียน สจล.</p>');
    expect(appShell).not.toContain('ได้ง่ายๆ!');
    expect(appShell).toContain('className="icon-text-button logout-button"');
    expect(appShell).toContain('<span className="logout-label">Logout</span>');
    expect(css).toContain('.topbar .logout-button');
    expect(css).toContain('.topbar .logout-label');
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(92px, 1fr))');
    expect(css).toContain('width: 44px');
  });

  it('wraps long title-card identity fields cleanly', () => {
    expect(reportTitleCard).toContain('className="kpm-info-details-item"');
    expect(reportTitleCard).toContain('kpm-info-row-empty');
    expect(reportTitleCard).not.toContain('{orgParts.length ? (');
    expect(cssRule('.kpm-info-row')).toContain('display: flex');
    expect(cssRule('.kpm-info-row')).toContain('min-height');
    expect(cssRule('.kpm-info-row-empty')).toContain('visibility: hidden');
    expect(cssRule('.kpm-info-row')).toContain('flex-wrap: wrap');
    expect(cssRule('.kpm-info-row')).toContain('overflow-wrap: anywhere');
    expect(cssRule('.kpm-info-details')).toContain('display: flex');
    expect(cssRule('.kpm-info-details')).toContain('flex-wrap: wrap');
    expect(cssRule('.kpm-info-details')).toContain('overflow-wrap: anywhere');
    expect(css).toContain('.kpm-info-row > span + span::before');
    expect(css).toContain('.kpm-info-details-item + .kpm-info-details-item::before');
    expect(css).toContain('content: none');
  });

  it('uses a split login layout with a local image panel', () => {
    expect(loginView).toContain("const loginImageUrl = '/login-bg.jpg';");
    expect(loginView).toContain("const loginImagesConfigUrl = '/login-images.txt';");
    expect(loginView).toContain('const loginImageCycleMs = 5000;');
    expect(loginView).toContain('fetch(loginImagesConfigUrl');
    expect(loginView).toContain('setInterval');
    expect(loginView).toContain('objectPosition');
    expect(loginView).not.toContain('previousLoginImageIndex');
    expect(loginView).toContain('className="login-layout"');
    expect(loginView).toContain('className="login-visual"');
    expect(loginView).toContain('login-visual-image active');
    expect(loginView).toContain('login-visual-image inactive');
    expect(loginView).not.toContain('login-visual-image exiting');
    expect(loginView).not.toContain('login-visual-image idle');
    expect(cssRule('.login-page')).toContain('grid-template-rows: 1fr auto');
    expect(cssRule('.login-page')).toContain('height: 100dvh');
    expect(cssRule('.login-page')).toContain('row-gap: 20px');
    expect(cssRule('.login-page')).toContain('overflow: hidden');
    expect(cssRule('.login-page .app-footer')).toContain('margin-top: 0');
    expect(cssRule('.login-layout')).toContain('grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr)');
    expect(cssRule('.login-layout')).toContain('height: min(620px, calc(100dvh - 128px))');
    expect(cssRule('.login-layout')).toContain('max-height: 100%');
    expect(cssRule('.login-visual')).toContain('min-height: 0');
    expect(cssRule('.login-visual')).toContain('height: 100%');
    expect(cssRule('.login-page .brand-mark')).toContain('width: 64px');
    expect(cssRule('.login-page .brand-mark')).toContain('height: 64px');
    expect(cssRule('.login-visual::after')).toContain('z-index: 2');
    expect(cssRule('.login-visual-image')).toContain('object-fit: cover');
    expect(cssRule('.login-visual-image')).toContain('position: absolute');
    expect(cssRule('.login-visual-image')).toContain('opacity: 0');
    expect(cssRule('.login-visual-image')).toContain('z-index: 0');
    expect(cssRule('.login-visual-image')).toContain('transition: opacity 2200ms ease-in-out');
    expect(cssRule('.login-visual-image')).not.toContain('transform');
    expect(cssRule('.login-visual-image.active')).toContain('opacity: 1');
    expect(cssRule('.login-visual-image.active')).toContain('z-index: 1');
    expect(cssRule('.login-visual-image.active')).not.toContain('animation');
    expect(cssRule('.login-visual-image.inactive')).toContain('opacity: 0');
    expect(css).not.toContain('@keyframes login-image-zoom');
    expect(cssRule('.login-visual-image.active')).not.toContain('transform');
    expect(cssRule('.login-visual-image.inactive')).not.toContain('transform');
    expect(cssRule('.login-form-column')).toContain('justify-content: center');
    expect(css).toContain('@media (max-width: 899px)');
    expect(css).toContain('align-items: center');
    expect(css).toContain('grid-template-columns: 1fr');
    expect(css).toContain('grid-template-rows: minmax(96px, 28%) minmax(0, 1fr)');
    expect(css).toContain('height: auto');
  });

  it('provides a public login image list and allows remote HTTPS image links', () => {
    expect(existsSync(loginImagesFile)).toBe(true);
    expect(readFileSync(loginImagesFile, 'utf8')).toContain('One login image URL or public path per line');
    expect(serverApp).toContain("img-src 'self' data: blob: https:");
    expect(vercelConfig).toContain("img-src 'self' data: blob: https:");
  });

  it('keeps timetable scrolling scoped away from title and TBA surfaces', () => {
    expect(cssRule('.kpm-container')).not.toContain('overflow-x: auto');
    expect(cssRule('.kpm-scroll-surface')).toContain('overflow-x: auto');
    expect(cssRule('.kpm-scroll-surface')).not.toContain('-webkit-overflow-scrolling: touch');
    expect(cssRule('.kpm-scroll-surface')).not.toContain('scrollbar-gutter: stable');
    expect(cssRule('.kpm-grid')).toContain('min-width');
    expect(studyView).toContain('className="kpm-scroll-surface"');
    expect(examView).toContain('className="kpm-scroll-surface"');

    const tableContainerRule = css.match(/\.kpm-grade-container,\s*\.kpm-summary-container\s*{([^}]*)}/)?.[1] ?? '';
    expect(tableContainerRule).toContain('overflow-x: auto');
    expect(tableContainerRule).not.toContain('-webkit-overflow-scrolling: touch');
  });

  it('defines a desktop-only export layout override', () => {
    expect(cssRule('.export-target.export-desktop')).toContain('width: 1400px');
    expect(cssRule('.export-target.export-desktop')).toContain('max-width: none');
    expect(cssRule('.export-target.export-desktop')).toContain('overflow: visible');
    expect(cssRule('.export-target.export-desktop .kpm-scroll-surface')).toContain('overflow: visible');
    expect(cssRule('.export-target.export-desktop .kpm-info-card')).toContain('padding: 28px 32px');
    expect(cssRule('.export-target.export-desktop .kpm-info-row')).toContain('flex-direction: row');
    expect(cssRule('.export-target.export-desktop .kpm-info-details')).toContain('flex-direction: row');
    expect(cssRule('.export-target.export-desktop .kpm-info-row > span + span::before')).toContain("content: '·'");
    expect(cssRule('.export-target.export-desktop .kpm-info-details-item + .kpm-info-details-item::before')).toContain("content: '·'");
    expect(cssRule('.export-target.export-desktop .kpm-tba-list')).toContain('repeat(auto-fill, minmax(300px, 1fr))');
  });
});
