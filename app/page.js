'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) { setIsInstalled(true); return }

    // iOS Safari — no beforeinstallprompt, show manual hint instead
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const dismissed = localStorage.getItem('nudge_ios_hint_dismissed')
    if (isIos && isSafari && !dismissed) {
      setShowIosHint(true)
      return
    }

    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismissIosHint = () => {
    localStorage.setItem('nudge_ios_hint_dismissed', '1')
    setShowIosHint(false)
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface h-dvh flex flex-col max-w-[430px] mx-auto overflow-hidden">

      <header className="flex justify-between items-center px-8 pt-12 pb-3 flex-shrink-0">
        <span className="text-lg font-black tracking-tighter text-primary">Nudge</span>
        <Link href="/settings">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>person</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-8 pb-8 justify-between min-h-0">

        {/* Hero */}
        <section className="pt-2">
          <h1 className="text-[2.5rem] leading-[1.05] font-black tracking-tighter text-primary mb-3">
            Please, rest on your<br />commute.
          </h1>
          <p className="text-[0.9375rem] text-on-surface-variant leading-relaxed">
            Nudge will make sure you dont miss your stop..
          </p>
        </section>

        {/* Visual route card */}
        <div className="rounded-2xl bg-surface-container px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary flex-shrink-0" />
            <span className="text-[0.8125rem] font-bold text-secondary uppercase tracking-widest">Your location</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center flex-shrink-0 mt-1">
              <div className="w-0.5 h-5 bg-primary/20" />
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
              <div className="w-0.5 h-5 bg-primary/20" />
            </div>
            <div className="flex-1 py-1">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Monitoring</p>
              <p className="text-[0.9375rem] font-bold text-on-surface">You're on the bus</p>
            </div>
            <div className="text-right">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">ETA</p>
              <p className="text-[0.9375rem] font-black text-primary">12 min</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
            <span className="text-[0.8125rem] font-bold text-primary">1000 17th Ave N</span>
          </div>
        </div>

        {/* Feature list */}
        <section className="space-y-2.5">
          {[
            ['notifications_active', 'Wakes you before your stop'],
            ['emergency_share',      'Alerts your contact if you miss it'],
            ['location_on',         'Shares your live location when it matters'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container"
                  style={{ fontSize: '16px', fontVariationSettings: "'wght' 600, 'FILL' 1" }}>
                  {icon}
                </span>
              </div>
              <span className="text-[0.9375rem] font-medium text-on-surface">{text}</span>
            </div>
          ))}
        </section>

        {/* CTAs */}
        <div className="space-y-3">
          {/* iOS install hint — Safari doesn't support beforeinstallprompt */}
          {showIosHint && (
            <div className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-secondary-container border border-secondary/20">
              <span className="material-symbols-outlined text-on-secondary-container flex-shrink-0" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                ios_share
              </span>
              <p className="text-[0.8125rem] font-medium text-on-secondary-container flex-1 leading-snug">
                Tap <span className="font-black">Share</span> then <span className="font-black">Add to Home Screen</span> to install
              </p>
              <button onClick={dismissIosHint} className="flex-shrink-0 active:opacity-60">
                <span className="material-symbols-outlined text-on-secondary-container/60" style={{ fontSize: '16px' }}>close</span>
              </button>
            </div>
          )}

          {/* PWA install prompt — only shown when browser supports it and not yet installed */}
          {installPrompt && !isInstalled && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-3 px-5 h-[48px] rounded-2xl bg-secondary-container border border-secondary/20 active:scale-[0.97] transition-all"
            >
              <span className="material-symbols-outlined text-on-secondary-container flex-shrink-0" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                install_mobile
              </span>
              <div className="text-left flex-1">
                <p className="text-[0.8125rem] font-bold text-on-secondary-container leading-none">Add to Home Screen</p>
                <p className="text-[0.6875rem] text-on-secondary-container/70 mt-0.5">Works offline · No app store needed</p>
              </div>
              <span className="material-symbols-outlined text-on-secondary-container/50" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
          )}

          <Link
            href="/journey/setup"
            className="flex items-center justify-center w-full h-[54px] rounded-full bg-primary text-white font-bold text-[1rem] tracking-tight active:scale-[0.97] transition-all duration-150"
          >
            Start a trip
          </Link>
          <Link
            href="/settings"
            className="block text-center text-[0.8125rem] font-medium text-on-surface-variant py-1.5"
          >
            Set up emergency contacts first →
          </Link>
        </div>

      </main>

    </div>
  )
}
