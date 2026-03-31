import type {
  KPIData,
  EnrollmentPoint,
  DeptSlice,
  GradeRecord,
  UploadZone,
  CourseRecommendation,
  GraphNode,
  GraphEdge,
  CatalogCourse,
} from '@/types'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const KPI_DATA: KPIData = {
  totalCourses: 124,
  avgFailureRate: '18.4%',
  modelConfidence: '91.2%',
}

export const ENROLLMENT_TRENDS: EnrollmentPoint[] = [
  { sem: "Fall '22", enrolled: 1840 },
  { sem: "Spr '23", enrolled: 2110 },
  { sem: "Fall '23", enrolled: 1975 },
  { sem: "Spr '24", enrolled: 2340 },
  { sem: "Fall '24", enrolled: 2560 },
  { sem: "Spr '25", enrolled: 2780 },
]

export const DEPT_DISTRIBUTION: DeptSlice[] = [
  { dept: 'CS',   count: 58, color: '#4f46e5' },
  { dept: 'BIF',  count: 34, color: '#0ea5e9' },
  { dept: 'Math', count: 32, color: '#06b6d4' },
]

// ─── Data Management ─────────────────────────────────────────────────────────

export const UPLOAD_ZONES: UploadZone[] = [
  { key: 'grades',        label: 'Historical Grades',  icon: '📊', desc: 'CSV with year, semester, course, fail ratio' },
  { key: 'studyplan',     label: 'Study Plan',          icon: '📋', desc: 'Student degree progression maps' },
  { key: 'prerequisites', label: 'Prerequisites',       icon: '🔗', desc: 'Course dependency mapping file' },
]

export const GRADE_RECORDS: GradeRecord[] = [
  { year: 2023, semester: 'Fall',   campus: 'Main',  courseName: 'Data Structures',    courseNumber: 'CSC243', failRatio: 0.12 },
  { year: 2023, semester: 'Fall',   campus: 'Main',  courseName: 'Algorithms',         courseNumber: 'CSC320', failRatio: 0.18 },
  { year: 2023, semester: 'Spring', campus: 'North', courseName: 'Bioinformatics I',   courseNumber: 'BIF210', failRatio: 0.09 },
  { year: 2023, semester: 'Spring', campus: 'Main',  courseName: 'Calculus III',       courseNumber: 'MTH301', failRatio: 0.22 },
  { year: 2024, semester: 'Fall',   campus: 'South', courseName: 'Database Systems',   courseNumber: 'CSC350', failRatio: 0.15 },
  { year: 2024, semester: 'Fall',   campus: 'Main',  courseName: 'Linear Algebra',     courseNumber: 'MTH215', failRatio: 0.28 },
  { year: 2024, semester: 'Spring', campus: 'North', courseName: 'Genomics Analysis',  courseNumber: 'BIF320', failRatio: 0.07 },
  { year: 2024, semester: 'Spring', campus: 'Main',  courseName: 'OS Concepts',        courseNumber: 'CSC380', failRatio: 0.19 },
  { year: 2024, semester: 'Fall',   campus: 'South', courseName: 'Differential Eq.',   courseNumber: 'MTH340', failRatio: 0.33 },
  { year: 2025, semester: 'Spring', campus: 'Main',  courseName: 'Machine Learning',   courseNumber: 'CSC420', failRatio: 0.11 },
]

// ─── Recommendation Engine ───────────────────────────────────────────────────

export const RECOMMENDATIONS: CourseRecommendation[] = [
  { course: 'CSC320', name: 'Algorithms',         score: 92, demand: 'High',   ready: 48, prereq: 'CSC243', failRatio: 0.08 },
  { course: 'CSC350', name: 'Database Systems',   score: 85, demand: 'High',   ready: 42, prereq: 'CSC243', failRatio: 0.12 },
  { course: 'CSC380', name: 'OS Concepts',        score: 78, demand: 'High',   ready: 37, prereq: 'CSC243', failRatio: 0.15 },
  { course: 'CSC420', name: 'Machine Learning',   score: 71, demand: 'Medium', ready: 29, prereq: 'CSC320', failRatio: 0.11 },
  { course: 'CSC410', name: 'Computer Networks',  score: 65, demand: 'Medium', ready: 24, prereq: 'CSC320', failRatio: 0.17 },
  { course: 'BIF210', name: 'Bioinformatics I',   score: 88, demand: 'High',   ready: 44, prereq: 'MTH215', failRatio: 0.09 },
  { course: 'BIF320', name: 'Genomics Analysis',  score: 74, demand: 'Medium', ready: 31, prereq: 'BIF210', failRatio: 0.07 },
  { course: 'BIF400', name: 'Proteomics',         score: 52, demand: 'Low',    ready: 18, prereq: 'BIF320', failRatio: 0.21 },
  { course: 'MTH215', name: 'Linear Algebra',     score: 81, demand: 'High',   ready: 39, prereq: 'MTH120', failRatio: 0.28 },
  { course: 'MTH301', name: 'Calculus III',       score: 69, demand: 'Medium', ready: 26, prereq: 'MTH215', failRatio: 0.22 },
  { course: 'MTH340', name: 'Differential Eq.',   score: 44, demand: 'Low',    ready: 14, prereq: 'MTH301', failRatio: 0.33 },
  { course: 'CSC445', name: 'Compilers',          score: 38, demand: 'Low',    ready: 11, prereq: 'CSC380', failRatio: 0.29 },
]

// ─── Prerequisite Graph ───────────────────────────────────────────────────────

export const GRAPH_NODES: GraphNode[] = [
  { id: 'MTH120', x: 80,  y: 60,  dept: 'MTH', bottleneck: false },
  { id: 'MTH215', x: 80,  y: 170, dept: 'MTH', bottleneck: true  },
  { id: 'MTH301', x: 80,  y: 280, dept: 'MTH', bottleneck: false },
  { id: 'MTH340', x: 80,  y: 390, dept: 'MTH', bottleneck: false },
  { id: 'CSC101', x: 300, y: 60,  dept: 'CSC', bottleneck: false },
  { id: 'CSC243', x: 300, y: 170, dept: 'CSC', bottleneck: true  },
  { id: 'CSC320', x: 220, y: 280, dept: 'CSC', bottleneck: false },
  { id: 'CSC350', x: 380, y: 280, dept: 'CSC', bottleneck: false },
  { id: 'CSC380', x: 300, y: 390, dept: 'CSC', bottleneck: false },
  { id: 'CSC420', x: 220, y: 490, dept: 'CSC', bottleneck: false },
  { id: 'BIF210', x: 520, y: 170, dept: 'BIF', bottleneck: false },
  { id: 'BIF320', x: 520, y: 280, dept: 'BIF', bottleneck: false },
  { id: 'BIF400', x: 520, y: 390, dept: 'BIF', bottleneck: false },
]

export const GRAPH_EDGES: GraphEdge[] = [
  ['MTH120', 'MTH215'], ['MTH215', 'MTH301'], ['MTH301', 'MTH340'],
  ['CSC101', 'CSC243'], ['CSC243', 'CSC320'], ['CSC243', 'CSC350'],
  ['CSC320', 'CSC380'], ['CSC380', 'CSC420'],
  ['MTH215', 'BIF210'], ['BIF210', 'BIF320'], ['BIF320', 'BIF400'],
]

export const DEPT_COLORS: Record<string, string> = {
  CSC: '#4f46e5',
  MTH: '#0ea5e9',
  BIF: '#10b981',
}

// ─── Scheduler – full course catalog ─────────────────────────────────────────

export const COURSE_CATALOG: CatalogCourse[] = [
  // CSC
  { code: 'CSC101', name: 'Intro to Programming',    dept: 'CSC', credits: 3 },
  { code: 'CSC201', name: 'Discrete Mathematics',    dept: 'CSC', credits: 3 },
  { code: 'CSC243', name: 'Data Structures',         dept: 'CSC', credits: 4 },
  { code: 'CSC320', name: 'Algorithms',              dept: 'CSC', credits: 4 },
  { code: 'CSC350', name: 'Database Systems',        dept: 'CSC', credits: 3 },
  { code: 'CSC360', name: 'Software Engineering',    dept: 'CSC', credits: 3 },
  { code: 'CSC370', name: 'Web Development',         dept: 'CSC', credits: 3 },
  { code: 'CSC380', name: 'OS Concepts',             dept: 'CSC', credits: 4 },
  { code: 'CSC410', name: 'Computer Networks',       dept: 'CSC', credits: 3 },
  { code: 'CSC420', name: 'Machine Learning',        dept: 'CSC', credits: 4 },
  { code: 'CSC430', name: 'Computer Vision',         dept: 'CSC', credits: 3 },
  { code: 'CSC445', name: 'Compilers',               dept: 'CSC', credits: 4 },
  // BIF
  { code: 'BIF110', name: 'Intro to Bioinformatics', dept: 'BIF', credits: 3 },
  { code: 'BIF210', name: 'Bioinformatics I',        dept: 'BIF', credits: 4 },
  { code: 'BIF220', name: 'Molecular Biology',       dept: 'BIF', credits: 3 },
  { code: 'BIF320', name: 'Genomics Analysis',       dept: 'BIF', credits: 4 },
  { code: 'BIF330', name: 'Structural Biology',      dept: 'BIF', credits: 3 },
  { code: 'BIF400', name: 'Proteomics',              dept: 'BIF', credits: 4 },
  { code: 'BIF410', name: 'Systems Biology',         dept: 'BIF', credits: 3 },
  // MTH
  { code: 'MTH120', name: 'Pre-Calculus',            dept: 'MTH', credits: 3 },
  { code: 'MTH130', name: 'Calculus I',              dept: 'MTH', credits: 4 },
  { code: 'MTH140', name: 'Calculus II',             dept: 'MTH', credits: 4 },
  { code: 'MTH215', name: 'Linear Algebra',          dept: 'MTH', credits: 4 },
  { code: 'MTH230', name: 'Probability Theory',      dept: 'MTH', credits: 3 },
  { code: 'MTH301', name: 'Calculus III',            dept: 'MTH', credits: 4 },
  { code: 'MTH310', name: 'Numerical Methods',       dept: 'MTH', credits: 3 },
  { code: 'MTH340', name: 'Differential Equations',  dept: 'MTH', credits: 4 },
  { code: 'MTH420', name: 'Abstract Algebra',        dept: 'MTH', credits: 3 },
]

export const DEPT_CHIP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CSC: { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' },
  BIF: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  MTH: { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
}
