// ─── Navigation ───────────────────────────────────────────────────────────────

export type PageId = 'dashboard' | 'data' | 'engine' | 'graph' | 'scheduler';

export interface NavItem {
  id: PageId;
  label: string;
  iconName: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface KPIData {
  totalCourses: number;
  avgFailureRate: string;
  modelConfidence: string;
}

export interface EnrollmentPoint {
  sem: string;
  enrolled: number;
}

export interface DeptSlice {
  dept: string;
  count: number;
  color: string;
}

// ─── Data Management ─────────────────────────────────────────────────────────

export interface GradeRecord {
  year: number;
  semester: string;
  campus: string;
  courseName: string;
  courseNumber: string;
  failRatio: number;
}

export type UploadKey = 'grades' | 'studyplan' | 'prerequisites';

export interface UploadZone {
  key: UploadKey;
  label: string;
  icon: string;
  desc: string;
}

// ─── Recommendation Engine ───────────────────────────────────────────────────

export type DemandLevel = 'High' | 'Medium' | 'Low';

export interface CourseRecommendation {
  course: string;
  name: string;
  score: number;
  demand: DemandLevel;
  ready: number;
  prereq: string;
  failRatio: number;
}

// ─── Prerequisite Graph ───────────────────────────────────────────────────────

export type DeptCode = 'CSC' | 'MTH' | 'BIF';

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  dept: DeptCode;
  bottleneck: boolean;
}

export type GraphEdge = [string, string];

// ─── Scheduler ────────────────────────────────────────────────────────────────

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface CatalogCourse {
  code: string
  name: string
  dept: string
  credits: number
}

export interface ScheduledEntry {
  id: string
  courseCode: string
  courseName: string
  dept: string
  day: WeekDay
  startTime: string // "HH:MM" format
  durationMins: number
  professor: string
  room: string
  color: string
}

export interface PlacementTarget {
  day: WeekDay
  startTime: string // "HH:MM"
}
