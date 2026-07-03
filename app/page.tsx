'use client'

import dynamic from 'next/dynamic'
import { Vortex } from '@/components/ui/vortex'
import { WavyBackground } from "@/components/ui/wavy-background"
import { useEffect, useState } from 'react'


const EncryptedText = dynamic(() => import('@/components/ui/encrypted-text').then(mod => mod.EncryptedText), {
  ssr: false,
})

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "willsleep"

const SITE_COPY: Record<string, { title: string; tagline: string }> = {
  willsleep: { title: "The Sleep Lab", tagline: "a space for dreaming" },
  yueqiao: { title: "Yueqiao Dev", tagline: "Coming soon" },
}

const { title, tagline } = SITE_COPY[siteName] || SITE_COPY.willsleep

// text reveal takes ~1.3s (26 chars x 50ms); leave a beat before fading out
const INTRO_DURATION_MS = 3500
const INTRO_FADE_MS = 700

export default function Home() {
  const [showVortex, setShowVortex] = useState(true)
  const [vortexGone, setVortexGone] = useState(false)

  useEffect(() => {
    if (!showVortex) return

    const dismiss = () => setShowVortex(false)
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

    const timer = setTimeout(dismiss, INTRO_DURATION_MS)
    events.forEach((event) => window.addEventListener(event, dismiss, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, dismiss))
    }
  }, [showVortex])

  // Unmount the vortex after the fade so its canvas stops animating
  useEffect(() => {
    if (showVortex) return
    const timer = setTimeout(() => setVortexGone(true), INTRO_FADE_MS)
    return () => clearTimeout(timer)
  }, [showVortex])

  return (
    <div>
      {/* Full-page Vortex intro; skippable via click/scroll/key, fades out on its own */}
      {!vortexGone && (
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
            </div>
          </Vortex>
        </div>
      )}

      <main className="relative z-10">
        <WavyBackground containerClassName="h-dvh">
          <div className="text-center">
            <h1 className="text-4xl text-white md:text-5xl">{title}</h1>
            <p className="mt-4 text-lg text-white/70">{tagline}</p>
          </div>
        </WavyBackground>

        {siteName === "willsleep" && (
          <footer className="absolute inset-x-0 bottom-0 z-10 pb-8 text-center text-sm text-white/60">
            Looking for my engineering work?{' '}
            <a
              href="https://career.yueqiao.dev/?utm_source=willsleep.dev&utm_medium=referral&utm_campaign=personal-site"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-white"
            >
              career.yueqiao.dev
            </a>
          </footer>
        )}
      </main>
    </div>
  )
}
