import Reveal from './Reveal'

export default function DownloadApp() {
  return (
    <section id="download" className="relative bg-paper text-center overflow-hidden py-[clamp(80px,12vh,150px)] px-5 md:px-16">
      <svg className="absolute top-[10%] right-[-3%] w-[280px] opacity-50 z-0" viewBox="0 0 200 200">
        <defs>
          <pattern id="dl-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="rgba(86,170,58,.28)" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#dl-dots)" />
      </svg>

      <div className="relative z-[2]">
        <Reveal className="text-xs tracking-[0.3em] uppercase font-semibold opacity-55 flex justify-center items-center gap-3">
          <span className="italic">05</span> — Mobile App
        </Reveal>
        <Reveal as="h2" className="mt-[18px] text-[clamp(2.2rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
          Download our
          <br />
          app <span className="italic font-medium text-accent">now.</span>
        </Reveal>

        <Reveal className="flex gap-[18px] justify-center flex-wrap mt-[42px]">
          <a href="#" data-hover className="inline-flex items-center gap-3.5 bg-ink text-paper px-[26px] py-3.5 rounded-[14px] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(10,10,10,.25)]">
            <svg viewBox="0 0 384 512" className="w-[30px] h-[30px] shrink-0" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            <span className="text-left">
              <span className="block text-[0.68rem] tracking-[0.08em] opacity-70 uppercase">Download on the</span>
              <span className="block text-[1.15rem] font-bold tracking-[-0.02em] leading-[1.1]">App Store</span>
            </span>
          </a>
          <a href="#" data-hover className="inline-flex items-center gap-3.5 bg-ink text-paper px-[26px] py-3.5 rounded-[14px] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(10,10,10,.25)]">
            <svg viewBox="0 0 512 512" className="w-[30px] h-[30px] shrink-0" fill="currentColor">
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
            </svg>
            <span className="text-left">
              <span className="block text-[0.68rem] tracking-[0.08em] opacity-70 uppercase">Get it on</span>
              <span className="block text-[1.15rem] font-bold tracking-[-0.02em] leading-[1.1]">Google Play</span>
            </span>
          </a>
        </Reveal>

        <Reveal as="p" className="mt-[26px] text-[0.85rem] opacity-55">
          We'll share the download link once your school is onboarded.
        </Reveal>
      </div>
    </section>
  )
}
