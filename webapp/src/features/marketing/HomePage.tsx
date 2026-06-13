import { useState } from 'react'
import './marketing.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import FeaturesCarousel from './components/FeaturesCarousel'
import WhySection from './components/WhySection'
import Testimonials from './components/Testimonials'
import CustomPackage from './components/CustomPackage'
import DownloadApp from './components/DownloadApp'
import Contact from './components/Contact'
import Footer from './components/Footer'
import EnquiryModal from './components/EnquiryModal'

/** Public marketing homepage — React/Tailwind port of school/index.html. */
export default function HomePage() {
  const [trialOpen, setTrialOpen] = useState(false)
  const openTrial = () => setTrialOpen(true)

  return (
    <div className="relative overflow-x-hidden bg-paper text-ink">
      <div className="mk-grain" />

      <Navbar onOpenTrial={openTrial} />
      <Hero onOpenTrial={openTrial} />
      <Marquee />
      <FeaturesCarousel />
      <WhySection />
      <Testimonials />
      <CustomPackage />
      <DownloadApp />
      <Contact />
      <Footer />

      <EnquiryModal open={trialOpen} onClose={() => setTrialOpen(false)} />
    </div>
  )
}
