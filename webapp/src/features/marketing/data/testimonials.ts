export interface Testimonial {
  /** Quote with an optional <em> emphasis word marked by {accent}. */
  quote: string
  accent: string
  rest: string
  initials: string
  name: string
  role: string
}

export const testimonials: Testimonial[] = [
  {
    quote: 'SchoolLID completely',
    accent: 'transformed',
    rest: 'how we run admin work. What used to take hours now takes minutes.',
    initials: 'RA',
    name: 'Ritu Aggarwal',
    role: 'Principal, Greenfield Academy',
  },
  {
    quote: 'Parents finally feel',
    accent: 'connected',
    rest: '. Attendance, exams, and timetables — everything in one beautiful app.',
    initials: 'SK',
    name: 'Suresh Kumar',
    role: 'Director, Sunrise Public School',
  },
  {
    quote: 'The admin panel is so',
    accent: 'intuitive',
    rest: 'that our staff needed almost zero training. Data security gave us total peace of mind.',
    initials: 'MP',
    name: 'Meena Pillai',
    role: 'Administrator, Heritage School',
  },
]
