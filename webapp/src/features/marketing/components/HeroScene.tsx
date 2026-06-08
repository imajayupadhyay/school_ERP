/**
 * Hero illustration — the teacher + student blackboard scene from
 * school/index.html. The scene is a trusted, static, hand-authored SVG, so it is
 * rendered verbatim for pixel-exact fidelity. The floating info chips are separate
 * animated elements (mk-bob-*).
 */

const sceneSvg = `
<svg viewBox="0 0 560 540" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;overflow:visible">
  <defs>
    <radialGradient id="halo" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="rgba(86,170,58,.28)"/>
      <stop offset="60%" stop-color="rgba(86,170,58,.08)"/>
      <stop offset="100%" stop-color="rgba(86,170,58,0)"/>
    </radialGradient>
  </defs>
  <circle cx="280" cy="240" r="220" fill="url(#halo)"/>
  <g>
    <circle cx="280" cy="250" r="206" fill="none" stroke="rgba(247,244,236,.22)" stroke-width="2" stroke-dasharray="2 14" stroke-linecap="round"/>
    <circle cx="280" cy="46" r="5" fill="#74c34a"/>
    <circle cx="486" cy="250" r="4" fill="rgba(247,244,236,.4)"/>
  </g>
  <ellipse cx="284" cy="490" rx="232" ry="30" fill="rgba(86,170,58,.07)"/>
  <path d="M70 490 H498" stroke="rgba(247,244,236,.12)" stroke-width="2"/>
  <path d="M150 96 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#74c34a" opacity=".8"/>
  <path d="M428 200 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" fill="#74c34a" opacity=".7"/>
  <g>
    <rect x="168" y="46" width="240" height="150" rx="12" fill="#092a23" stroke="#56aa3a" stroke-width="6"/>
    <path d="M196 86 H300" stroke="rgba(247,244,236,.7)" stroke-width="4" stroke-linecap="round"/>
    <path d="M196 108 H352" stroke="rgba(247,244,236,.35)" stroke-width="4" stroke-linecap="round"/>
    <path d="M196 128 H330" stroke="rgba(247,244,236,.35)" stroke-width="4" stroke-linecap="round"/>
    <path d="M300 170 L320 152 L338 162 L360 136" stroke="#74c34a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="360" cy="136" r="4" fill="#74c34a"/>
    <path d="M196 176 l9 -26 9 26 M199 168 h12" stroke="rgba(247,244,236,.85)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M226 162 v16 M218 170 h16" stroke="#74c34a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M210 196 L196 232 M366 196 L380 232" stroke="#56aa3a" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g transform="translate(96 120)">
    <path d="M0 16 L34 2 L68 16 L34 30 Z" fill="#f7f4ec"/>
    <path d="M16 23 V40 C16 47 52 47 52 40 V23" fill="#74c34a"/>
    <path d="M68 16 V34" stroke="#f7f4ec" stroke-width="3" stroke-linecap="round"/>
    <circle cx="68" cy="37" r="4" fill="#56aa3a"/>
  </g>
  <g transform="translate(440 110)">
    <rect x="0" y="0" width="14" height="56" rx="4" fill="#74c34a" transform="rotate(28 7 28)"/>
    <path d="M3 50 L17 58 L9 64 Z" fill="#f7f4ec" transform="rotate(28 7 28)"/>
  </g>
  <ellipse cx="200" cy="488" rx="92" ry="16" fill="rgba(0,0,0,.28)"/>
  <ellipse cx="386" cy="492" rx="84" ry="15" fill="rgba(0,0,0,.28)"/>
  <g transform="translate(200 480)">
    <ellipse cx="-14" cy="-2" rx="15" ry="7" fill="#0f3a31"/>
    <ellipse cx="16" cy="-2" rx="15" ry="7" fill="#0f3a31"/>
    <path d="M-44 -8 Q-30 -150 0 -158 Q30 -150 44 -8 Z" fill="#56aa3a"/>
    <path d="M0 -158 Q30 -150 44 -8 L18 -8 Q8 -120 0 -158 Z" fill="#3f8f29" opacity=".55"/>
    <path d="M-32 -150 Q-36 -206 0 -214 Q36 -206 32 -150 Q0 -138 -32 -150 Z" fill="#254f45"/>
    <path d="M0 -214 Q36 -206 32 -150 Q16 -144 0 -150 Z" fill="#0f3a31" opacity=".5"/>
    <path d="M-8 -206 L0 -188 L8 -206 Z" fill="#74c34a"/>
    <rect x="-8" y="-228" width="16" height="20" rx="7" fill="#e7b189"/>
    <circle cx="0" cy="-248" r="25" fill="#f2c9a0"/>
    <path d="M-25 -250 Q-27 -284 0 -286 Q27 -284 25 -250 Q12 -266 0 -266 Q-12 -266 -25 -250 Z" fill="#0f3a31"/>
    <circle cx="0" cy="-289" r="9" fill="#0f3a31"/>
    <circle cx="-8" cy="-248" r="2.4" fill="#0f3a31"/>
    <circle cx="8" cy="-248" r="2.4" fill="#0f3a31"/>
    <circle cx="-13" cy="-241" r="3" fill="#74c34a" opacity=".5"/>
    <circle cx="13" cy="-241" r="3" fill="#74c34a" opacity=".5"/>
    <path d="M-6 -239 Q0 -234 6 -239" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M-27 -198 Q-46 -168 -42 -136" stroke="#254f45" stroke-width="15" fill="none" stroke-linecap="round"/>
    <circle cx="-42" cy="-134" r="8" fill="#f2c9a0"/>
    <path d="M27 -198 Q56 -212 80 -236" stroke="#254f45" stroke-width="15" fill="none" stroke-linecap="round"/>
    <circle cx="82" cy="-238" r="8" fill="#f2c9a0"/>
    <line x1="80" y1="-236" x2="22" y2="-300" stroke="#74c34a" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g transform="translate(384 484)">
    <rect x="-34" y="-118" width="68" height="78" rx="20" fill="#357a22"/>
    <ellipse cx="-16" cy="-3" rx="15" ry="7" fill="#0f3a31"/>
    <ellipse cx="16" cy="-3" rx="15" ry="7" fill="#0f3a31"/>
    <path d="M-24 -10 L-22 -78 L22 -78 L24 -10 L7 -10 L0 -60 L-7 -10 Z" fill="#254f45"/>
    <path d="M-28 -78 Q-30 -126 0 -132 Q30 -126 28 -78 Z" fill="#56aa3a"/>
    <path d="M0 -132 Q30 -126 28 -78 L14 -78 Q8 -120 0 -132 Z" fill="#3f8f29" opacity=".5"/>
    <path d="M-16 -130 Q-22 -100 -20 -82" stroke="#74c34a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M16 -130 Q22 -100 20 -82" stroke="#74c34a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <rect x="-7" y="-150" width="14" height="20" rx="6" fill="#e7b189"/>
    <circle cx="0" cy="-168" r="24" fill="#f2c9a0"/>
    <path d="M-24 -170 Q-22 -196 0 -198 Q24 -196 24 -170 Q20 -182 0 -182 Q-14 -182 -24 -170 Z" fill="#0f3a31"/>
    <circle cx="-8" cy="-168" r="2.3" fill="#0f3a31"/>
    <circle cx="8" cy="-168" r="2.3" fill="#0f3a31"/>
    <circle cx="-13" cy="-161" r="3" fill="#74c34a" opacity=".5"/>
    <circle cx="13" cy="-161" r="3" fill="#74c34a" opacity=".5"/>
    <path d="M-6 -159 Q0 -154 6 -159" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M-26 -118 Q-40 -100 -34 -82" stroke="#56aa3a" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M26 -118 Q40 -100 34 -82" stroke="#56aa3a" stroke-width="14" fill="none" stroke-linecap="round"/>
    <circle cx="-34" cy="-80" r="7" fill="#f2c9a0"/>
    <circle cx="34" cy="-80" r="7" fill="#f2c9a0"/>
    <g transform="translate(0 -78)">
      <path d="M-38 0 L0 -8 L0 22 L-38 30 Z" fill="#f7f4ec" stroke="#cbb89c" stroke-width="1.5"/>
      <path d="M38 0 L0 -8 L0 22 L38 30 Z" fill="#f7f4ec" stroke="#cbb89c" stroke-width="1.5"/>
      <path d="M-30 6 H-8 M-30 14 H-8 M8 6 H30 M8 14 H30" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M0 -8 V22" stroke="#56aa3a" stroke-width="2.5"/>
    </g>
  </g>
</svg>`

export default function HeroScene() {
  return (
    <div className="relative justify-self-center w-full max-w-[560px]">
      {/* floating info chips */}
      <div className="mk-bob-1 hidden sm:flex absolute top-[6%] left-[-4%] z-[4] items-center gap-2.5 bg-paper text-ink rounded-[14px] px-[15px] py-[11px] text-[0.78rem] font-semibold shadow-[0_18px_40px_rgba(0,0,0,.35)]">
        <span className="w-[26px] h-[26px] rounded-lg bg-accent text-white grid place-items-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        Attendance done
      </div>
      <div className="mk-bob-2 hidden sm:flex absolute bottom-[10%] right-[-4%] z-[4] items-center gap-2.5 bg-paper text-ink rounded-[14px] px-[15px] py-[11px] text-[0.78rem] font-semibold shadow-[0_18px_40px_rgba(0,0,0,.35)]">
        <span className="w-[26px] h-[26px] rounded-lg bg-accent text-white grid place-items-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" />
          </svg>
        </span>
        Results published
      </div>

      <div dangerouslySetInnerHTML={{ __html: sceneSvg }} />
    </div>
  )
}
