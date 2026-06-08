const items: Array<[string, boolean]> = [
  ['Student Management', false],
  ['Attendance', true],
  ['Exam Management', false],
  ['Timetables', true],
  ['Academics', false],
]

export default function Marquee() {
  // Rendered twice so the -50% translate loops seamlessly.
  const loop = [...items, ...items]
  return (
    <div className="mk-marquee bg-paper text-ink border-y border-line py-[22px] overflow-hidden whitespace-nowrap">
      <div className="mk-marquee-track">
        {loop.map(([label, outlined], i) => (
          <span key={i} className={`mk-marquee-item ${outlined ? 'mk-out' : ''}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
