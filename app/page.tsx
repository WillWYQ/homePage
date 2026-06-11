'use client'

import dynamic from 'next/dynamic'
import { Vortex } from '@/components/ui/vortex'
import { WavyBackground } from "@/components/ui/wavy-background"
import { MagneticButton } from '@/components/ui/magnetic-button'
import { useEffect, useState } from 'react'
import { TextRevealCard } from '@/components/ui/text-reveal-card'


const EncryptedText = dynamic(() => import('@/components/ui/encrypted-text').then(mod => mod.EncryptedText), {
  ssr: false,
})

export default function Home() {
  const [showVortex, setShowVortex] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setShowVortex(false)
      } else {
        setShowVortex(true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div>
      {/* Full-page Vortex on load */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-700 ${showVortex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}>
        <Vortex
          backgroundColor="black"
          rangeY={500}
          className="flex items-center justify-center w-full h-full"
        >
          <div className="text-center">
            <EncryptedText
              text="Living outside the bitmask"
              encryptedClassName="text-green-500"
              revealedClassName="dark:text-grey text-white text-4xl"
              revealDelayMs={50}
            />
            <br />

          </div>
        </Vortex>
      </div>

      {/* Rest of your page content */}
      <main className="relative z-10">
        <WavyBackground>

        </WavyBackground>

        {/* Add more content to enable scrolling */}
        {/* <section className="bg-gray-50 py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Section 1</h3>
            <p className="text-gray-600 mb-4">Your content here...</p>
          </div>
        </section>

        <section className="bg-white py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Section 2</h3>
            <p className="text-gray-600 mb-4">More content...</p>
          </div>
        </section> */}
        {<section className="h-screen flex items-center justify-center height-[100]">
          <MagneticButton>
            <a
              href="https://career.yueqiao.dev/"
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 px-6 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform duration-150 hover:-translate-y-1"
            >
              Explore My Career
            </a>
          </MagneticButton>
        </section>}
      </main>
    </div>
  )
}