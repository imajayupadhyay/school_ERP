export interface FeatureItem {
  title: string
  description: string
  /** SVG path `d` for the card icon (24x24, stroke). */
  icon: string
}

export const features: FeatureItem[] = [
  {
    title: 'Student Management',
    description: 'Complete profiles, records, and lifecycle tracking in one place.',
    icon: 'M16 11a4 4 0 1 0-8 0M4 21v-1a6 6 0 0 1 12 0v1',
  },
  {
    title: 'Academics Management',
    description: 'Curriculum, subjects, and class structures organised effortlessly.',
    icon: 'M4 19V5l8-2 8 2v14M9 9h6',
  },
  {
    title: 'Slider Management',
    description: 'Curate the content and announcements that greet your community.',
    icon: 'M3 9l9-6 9 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  },
  {
    title: 'Teacher Management',
    description: 'Onboard, assign, and empower your teaching staff with ease.',
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8',
  },
  {
    title: 'Session Year Management',
    description: 'Roll over academic years and archive data without the headache.',
    icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  },
  {
    title: 'Holiday Management',
    description: 'Plan, publish, and sync the school calendar in seconds.',
    icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  },
  {
    title: 'Timetable Management',
    description: 'Conflict-free schedules built and shared automatically.',
    icon: 'M12 8v8M8 12h8M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  },
  {
    title: 'Attendance Management',
    description: 'Real-time attendance for students and staff, anywhere.',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  },
  {
    title: 'Exam Management',
    description: 'Exams, grading, and results — streamlined end to end.',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  },
]
