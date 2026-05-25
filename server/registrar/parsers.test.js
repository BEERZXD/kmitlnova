import { describe, expect, it } from 'vitest';
import {
  parseExamReport,
  parseGradeReport,
  parseStudentProfile,
  parseStudyReport,
} from './parsers.js';

const studyHtml = `
<table>
  <tr><td colspan="18">สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง</td></tr>
  <tr><td colspan="18">ประจำภาคเรียนที่ 1/2569</td></tr>
  <tr><td colspan="18">รหัสนักศึกษา 66010001 นาย โนวา ทดสอบ</td></tr>
  <tr>
    <td>ลำดับ</td><td></td><td>รหัสวิชา</td><td></td><td>ชื่อวิชา</td><td></td><td>หน่วยกิต</td><td></td><td>ทฤษฎี</td><td></td><td>ปฏิบัติ</td><td></td><td>วัน-เวลาเรียน</td><td></td><td>ห้องเรียน</td><td></td><td>อาคาร</td><td></td>
  </tr>
  <tr>
    <td>1</td><td></td><td>01006012</td><td></td><td>WEB APPLICATION DEVELOPMENT</td><td></td><td>3</td><td></td><td>1</td><td></td><td>-</td><td></td><td>จ. 09:00 - 12:00 น.(ท)<br>พ. 13:00 - 15:00 น.(ป)</td><td></td><td>E12-502<br>E12-505</td><td></td><td>E12</td><td></td>
  </tr>
</table>`;

const examHtml = `
<table>
  <tr><td colspan="18">ประจำภาคเรียนที่ 1/2569</td></tr>
  <tr>
    <td>ลำดับ</td><td></td><td>รหัสวิชา</td><td></td><td>ชื่อวิชา</td><td></td><td>ตอนเรียน</td><td></td><td>หน่วยกิต</td><td></td><td>ประเภท</td><td></td><td>วันที่สอบ</td><td></td><td>เวลาสอบ</td><td></td><td>ห้องสอบ</td><td></td>
  </tr>
  <tr>
    <td>1</td><td></td><td>01006012</td><td></td><td>WEB APPLICATION DEVELOPMENT</td><td></td><td>1</td><td></td><td>3</td><td></td><td>ทฤษฎี</td><td></td><td>อ. 24 มี.ค. 26</td><td></td><td>09:30-12:30 น.</td><td></td><td>ห้อง:E12-502</td><td></td>
  </tr>
  <tr>
    <td>2</td><td></td><td>01006013</td><td></td><td>PROJECT</td><td></td><td>1</td><td></td><td>3</td><td></td><td>ทฤษฎี</td><td></td><td>-</td><td></td><td>-</td><td></td><td>-</td><td></td>
  </tr>
</table>`;

const gradeHtml = `
<table>
  <tr><td colspan="14">ID: 66010001 Name: NOVA TEST Semester/Year: 1/2569</td></tr>
  <tr>
    <td>No.</td><td></td><td>Course No.</td><td></td><td>Course Title</td><td></td><td>Section</td><td></td><td>Credit</td><td></td><td>Type</td><td></td><td>Grade</td><td></td>
  </tr>
  <tr>
    <td>1</td><td></td><td>01006012</td><td></td><td>WEB APPLICATION DEVELOPMENT</td><td></td><td>1</td><td></td><td>3</td><td></td><td>Lecture</td><td></td><td>A</td><td></td>
  </tr>
  <tr>
    <td>CA</td><td></td><td>CP</td><td></td><td>CD</td><td></td><td>GP</td><td></td><td>GPS/GPA</td><td></td><td>Status</td><td></td><td></td><td></td>
  </tr>
  <tr>
    <td>Cumulation</td><td></td><td>3</td><td></td><td>3</td><td></td><td>3</td><td></td><td>12</td><td></td><td>4.00</td><td></td><td>Pass</td><td></td>
  </tr>
</table>`;

describe('registrar report parsers', () => {
  it('parses raw Thai faculty and major from the student profile page', () => {
    const profileHtml = `
      <table>
        <tr><td>สถานภาพนักศึกษา</td><td>เรียน</td></tr>
        <tr><td>คณะ</td><td>วิศวกรรมศาสตร์</td></tr>
        <tr><td>ภาควิชา</td><td>วิศวกรรมไฟฟ้า</td></tr>
        <tr><td>สาขาวิชา</td><td>วิศวกรรมไฟฟ้า</td></tr>
      </table>`;

    expect(parseStudentProfile(profileHtml)).toEqual({
      faculty: 'คณะวิศวกรรมศาสตร์',
      department: 'สาขาวิชา วิศวกรรมไฟฟ้า',
      rawDepartment: 'ภาควิชา วิศวกรรมไฟฟ้า สาขาวิชา วิศวกรรมไฟฟ้า',
    });
  });

  it('parses study courses with multiple time slots and rooms', () => {
    const result = parseStudyReport(studyHtml);

    expect(result.student.semester).toContain('1/2569');
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]).toMatchObject({
      code: '01006012',
      name: 'WEB APPLICATION DEVELOPMENT',
      credits: '3',
      theorySection: '1',
      practiceSection: '-',
      building: 'E12',
    });
    expect(result.courses[0].slots).toEqual([
      expect.objectContaining({ day: 'จ.', start: '09:00', end: '12:00', room: 'E12-502' }),
      expect.objectContaining({ day: 'พ.', start: '13:00', end: '15:00', room: 'E12-505' }),
    ]);
  });

  it('parses scheduled and unscheduled exam rows', () => {
    const result = parseExamReport(examHtml);

    expect(result.exams).toHaveLength(2);
    expect(result.exams[0]).toMatchObject({
      code: '01006012',
      dateRaw: 'อ. 24 มี.ค. 26',
      start: '09:30',
      end: '12:30',
      location: 'E12-502',
      isTba: false,
    });
    expect(result.exams[1]).toMatchObject({
      code: '01006013',
      isTba: true,
    });
  });

  it('normalizes registrar exam locations without duplicate final-exam translation', () => {
    const html = `
      <table>
        <tr><td>ลำดับที่</td><td>รหัสวิชา</td><td>รายวิชา</td><td>กลุ่ม</td><td>หน่วยกิต</td><td>ทฤษฎี/ปฏิบัติ</td><td>วัน-เดือน-ปี ที่สอบ</td><td>เวลาสอบ</td><td>อาคาร-ห้อง-ที่นั่งสอบ</td></tr>
        <tr><td>1</td><td>01026219</td><td>DIGITAL SYSTEMS AND MICROPROCESSORS</td><td>2</td><td>3 (3-0)</td><td>Lecture</td><td>อ. 24 มี.ค. 26</td><td>09:30-12:30 น.</td><td>อาคาร:E12-505: F2</td></tr>
        <tr><td>2</td><td>01026215</td><td>ELECTRICAL ENGINEERING LABORATORY 2</td><td>2</td><td>1 (0-2)</td><td>Practice</td><td></td><td></td><td>สอบในช่วงสอบปลายภาค (ในห้องสอบ)<br>Examination during the final exam (in the examination room)</td></tr>
        <tr><td>3</td><td>01026216</td><td>ELECTRICAL CIRCUITS</td><td>2</td><td>3 (3-0)</td><td>ทฤษฎี</td><td>อ. 24 มี.ค. 26</td><td>09:30-12:30 น.</td><td>สอบในช่วงสอบปลายภาค (ในห้องสอบ)<br>Examination during the final exam (in the examination room)</td></tr>
      </table>`;

    const result = parseExamReport(html);

    expect(result.exams[0]).toMatchObject({
      code: '01026219',
      type: 'ทฤษฎี',
      location: 'E12-505 (F2)',
      isTba: false,
    });
    expect(result.exams[1]).toMatchObject({
      code: '01026215',
      type: 'ปฏิบัติ',
      location: 'สอบในช่วงสอบปลายภาค (ในห้องสอบ)',
      isTba: true,
    });
    expect(result.exams[2]).toMatchObject({
      code: '01026216',
      location: 'สอบในช่วงสอบปลายภาค (ในห้องสอบ)',
      reason: 'สอบในช่วงสอบปลายภาค (ในห้องสอบ)',
      isTba: true,
    });
  });

  it('parses grade courses and cumulative GPA summary', () => {
    const result = parseGradeReport(gradeHtml);

    expect(result.student.id).toBe('66010001');
    expect(result.courses).toEqual([
      {
        no: '1',
        code: '01006012',
        name: 'WEB APPLICATION DEVELOPMENT',
        section: '1',
        credit: '3',
        type: 'Lecture',
        grade: 'A',
      },
    ]);
    expect(result.summary).toEqual([
      {
        title: 'Cumulation',
        ca: '3',
        cp: '3',
        cd: '3',
        gp: '12',
        gpa: '4.00',
        status: 'Pass',
      },
    ]);
  });

  it('parses decoded Thai legacy reports with rooms, exam reasons, pre-semester, and notes', () => {
    const decodedStudyHtml = `
      <table>
        <tr><td colspan="10">สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง</td></tr>
        <tr><td colspan="10">คณะวิศวกรรมศาสตร์</td></tr>
        <tr><td colspan="10">ภาควิชา วิศวกรรมไฟฟ้า สาขาวิชา วิศวกรรมไฟฟ้า</td></tr>
        <tr><td colspan="10">ประจำภาคเรียนที่ 2 ปีการศึกษา 2568</td></tr>
        <tr><td colspan="10">รหัสนักศึกษา 67010388 ชื่อ นายธนธรณ์ เทพสำเริง</td></tr>
        <tr><td>ลำดับ</td><td>รหัสวิชา</td><td>ชื่อวิชา</td><td>หน่วยกิต</td><td>วิชาทฤษฎี</td><td>วิชาปฏิบัติ</td><td>วัน-เวลาเรียน</td><td>ห้องเรียน</td><td>ตึก</td><td>หมายเหตุ</td></tr>
        <tr><td>1</td><td>01026219</td><td>DIGITAL SYSTEMS AND MICROPROCESSORS</td><td>3 (3-0)</td><td>2</td><td>102</td><td>อ. 08:45-10:15 น.(ท)+<br>อ. 10:30-12:00 (ท) ส. 13:00-15:00 น.(ป)</td><td>PW-204<br>PW-204<br>LAB-1</td><td>PW</td><td>เฉพาะรหัส</td></tr>
      </table>`;
    const decodedExamHtml = `
      <table>
        <tr><td colspan="9">สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง</td></tr>
        <tr><td colspan="9">คณะ วิศวกรรมศาสตร์</td></tr>
        <tr><td colspan="9">ภาควิชา วิศวกรรมไฟฟ้า สาขาวิชา วิศวกรรมไฟฟ้า</td></tr>
        <tr><td colspan="9">ประจำภาคเรียนที่ 2 ปีการศึกษา 2568</td></tr>
        <tr><td colspan="9">รหัสนักศึกษา 67010388 ชื่อ นายธนธรณ์ เทพสำเริง</td></tr>
        <tr><td>ลำดับที่</td><td>รหัสวิชา</td><td>รายวิชา</td><td>กลุ่ม</td><td>หน่วยกิต</td><td>ทฤษฎี/ปฏิบัติ</td><td>วัน-เดือน-ปี ที่สอบ</td><td>เวลาสอบ</td><td>อาคาร-ห้อง-ที่นั่งสอบ</td></tr>
        <tr><td>1</td><td>01026219</td><td>DIGITAL SYSTEMS AND MICROPROCESSORS</td><td>2</td><td>3 (3-0)</td><td>ทฤษฎี</td><td>อ. 24 มี.ค. 26</td><td>09:30-12:30 น.</td><td>ห้อง:PW-204</td></tr>
        <tr><td>2</td><td>90641005</td><td>TEAM-PROJECT 2</td><td>101</td><td>1 (0-2)</td><td>ปฏิบัติ</td><td>จัดสอบเอง</td></tr>
      </table>`;
    const decodedGradeHtml = `
      <table>
        <tr><td colspan="7">Faculty of Engineering</td></tr>
        <tr><td colspan="7">ID: 67010388 Name: Mr.Thanathorn Thepsumrung นายธนธรณ์ เทพสำเริง</td></tr>
        <tr><td colspan="7">Department: --> Major: Bachelor of Engineering Programme in Electrical Engineering Semester/Year : 2/2568</td></tr>
        <tr><td>No.</td><td>Course No.</td><td>Course Title</td><td>Section</td><td>Credit</td><td>Type</td><td>Grade</td></tr>
        <tr><td>1</td><td>01026215</td><td>ELECTRICAL ENGINEERING LABORATORY 2</td><td>2</td><td>1</td><td>Credit</td><td>B</td></tr>
        <tr><td></td><td>CA</td><td>CP</td><td>CD</td><td>GP</td><td>GPS/GPA</td><td>Status</td></tr>
        <tr><td>Semester</td><td>20</td><td>19</td><td>19</td><td>45.00</td><td>2.37</td><td>Pass</td></tr>
        <tr><td>Pre-Semester</td><td>73</td><td>60</td><td>60</td><td>170.00</td><td>2.83</td><td>Pass</td></tr>
        <tr><td>Cumulation</td><td>93</td><td>79</td><td>79</td><td>215.00</td><td>2.72</td><td>Pass</td></tr>
        <tr><td colspan="7">หมายเหตุ: X = ประกาศเกรดแล้ว X = ยังไม่ประกาศเกรด</td></tr>
      </table>`;

    const study = parseStudyReport(decodedStudyHtml);
    const exam = parseExamReport(decodedExamHtml);
    const grade = parseGradeReport(decodedGradeHtml);

    expect(study.student).toMatchObject({
      faculty: 'คณะวิศวกรรมศาสตร์',
      department: 'สาขาวิชา วิศวกรรมไฟฟ้า',
      semester: '2/2568',
      id: '67010388',
      name: 'นายธนธรณ์ เทพสำเริง',
    });
    expect(study.courses[0].slots).toEqual([
      expect.objectContaining({ room: 'PW-204', start: '08:45', end: '12:00', isPractice: false }),
      expect.objectContaining({ room: 'LAB-1', start: '13:00', end: '15:00', isPractice: true }),
    ]);
    expect(study.courses[0].building).toBe('PW');
    expect(exam.exams[0]).toMatchObject({ location: 'PW-204', type: 'ทฤษฎี' });
    expect(exam.exams[1]).toMatchObject({ isTba: true, location: 'จัดสอบเอง' });
    expect(grade.student).toMatchObject({
      university: 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง',
      faculty: 'คณะวิศวกรรมศาสตร์',
      department: 'สาขาวิชา วิศวกรรมไฟฟ้า',
      name: 'นายธนธรณ์ เทพสำเริง',
    });
    expect(grade.summary.map((item) => item.title)).toEqual(['Semester', 'Pre-Semester', 'Cumulation']);
    expect(grade.notes.join(' ')).toContain('หมายเหตุ');
  });

  it('normalizes Food Industry English legacy identity to Thai major-only fields', () => {
    const html = `
      <table>
        <tr><td colspan="7">Faculty of Food Industry</td></tr>
        <tr><td colspan="7">ID: 66070001 Name: FRIEND ACCOUNT</td></tr>
        <tr><td colspan="7">Department: --> Major: Bachelor of Science Program in Food Process Engineering Semester/Year : 1/2568</td></tr>
        <tr><td>No.</td><td>Course No.</td><td>Course Title</td><td>Section</td><td>Credit</td><td>Type</td><td>Grade</td></tr>
      </table>`;

    expect(parseGradeReport(html).student).toMatchObject({
      faculty: 'คณะอุตสาหกรรมอาหาร',
      department: 'สาขาวิชา วิศวกรรมแปรรูปอาหาร',
      semester: '1/2568',
    });
  });

  it('repairs mismatched legacy faculty when the major is Food Process Engineering', () => {
    const html = `
      <table>
        <tr><td colspan="7">Faculty of Information Technology</td></tr>
        <tr><td colspan="7">ID: 65080000 Name: FRIEND ACCOUNT</td></tr>
        <tr><td colspan="7">Department: --> Major: Bachelor of Science Programme in Food Process Engineering Semester/Year : 1/2568</td></tr>
        <tr><td>No.</td><td>Course No.</td><td>Course Title</td><td>Section</td><td>Credit</td><td>Type</td><td>Grade</td></tr>
      </table>`;

    expect(parseGradeReport(html).student).toMatchObject({
      faculty: 'คณะอุตสาหกรรมอาหาร',
      department: 'สาขาวิชา วิศวกรรมแปรรูปอาหาร',
      semester: '1/2568',
    });
  });
});
