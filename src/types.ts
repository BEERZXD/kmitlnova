export type ReportType = 'study' | 'exam' | 'grade';

export type ApiOption = {
  value: string;
  label: string;
  selected?: boolean;
};

export type StudentInfo = {
  id?: string;
  name?: string;
  semester?: string;
  university?: string;
  faculty?: string;
  department?: string;
  raw?: string;
};

export type StudySlot = {
  day: string;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
  type: string;
  isPractice: boolean;
  room: string;
};

export type StudyCourse = {
  code: string;
  name: string;
  credits: string;
  theorySection: string;
  practiceSection: string;
  building: string;
  slots: StudySlot[];
};

export type StudyReport = {
  type: 'study';
  student: StudentInfo;
  courses: StudyCourse[];
  options?: {
    semesters?: ApiOption[];
    years?: ApiOption[];
  };
};

export type ExamItem = {
  code: string;
  name: string;
  section: string;
  type: string;
  dateRaw: string;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
  sortKey: number;
  location: string;
  reason?: string;
  isTba: boolean;
};

export type ExamReport = {
  type: 'exam';
  student: StudentInfo;
  exams: ExamItem[];
  options?: {
    semesters?: ApiOption[];
    years?: ApiOption[];
    examKinds?: ApiOption[];
  };
};

export type GradeCourse = {
  no: string;
  code: string;
  name: string;
  section: string;
  credit: string;
  type: string;
  grade: string;
};

export type GradeSummary = {
  title: string;
  ca: string;
  cp: string;
  cd: string;
  gp: string;
  gpa: string;
  status: string;
};

export type GradeReport = {
  type: 'grade';
  student: StudentInfo;
  courses: GradeCourse[];
  summary: GradeSummary[];
  notes?: string[];
  options?: {
    semesters?: ApiOption[];
    years?: ApiOption[];
  };
};

export type ReportData = StudyReport | ExamReport | GradeReport;

export type ReportParams = {
  semester?: string;
  year?: string;
  examKind?: string;
};

export type ApiError = {
  code: string;
  message: string;
};
