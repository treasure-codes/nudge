'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled]     = useState(false)
  const [showIosHint, setShowIosHint]     = useState(false)
  const [contactsSet, setContactsSet]     = useState(false)

  useEffect(() => {
    // Check if contacts already set
    try {
      const c = localStorage.getItem('nudge_contacts')
      if (c) setContactsSet(JSON.parse(c).length > 0)
    } catch {}

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) { setIsInstalled(true); return }

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

      {/* Header */}
      <header className="flex justify-between items-center px-6 pt-12 pb-3 flex-shrink-0">
        <span className="text-lg font-black tracking-tighter text-primary">Nudge</span>
        <Link href="/settings">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '20px' }}
          >
            person
          </span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-6 pb-10 justify-between min-h-0">

        {/* Hero */}
        <section className="pt-6 flex-1 flex flex-col justify-center">
          <h1 className="text-[3rem] leading-[1.02] font-black tracking-tighter text-primary mb-5">
            Please, Sleep on<br />your commute.
          </h1>

          <p className="text-[1rem] text-on-surface-variant leading-relaxed max-w-[280px]">
            We watch your route while you rest and wake you up before your stop or alert someone you trust if you miss it.
          </p>

          {/* Contact status — contextual, not a CTA */}
          {/* {contactsSet && (
            <div className="flex items-center gap-2 mt-6">
              <div className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                >
                  check
                </span>
              </div>
              <span className="text-[0.8125rem] font-medium text-on-surface-variant">
                Emergency contact set up
              </span>
            </div>
          )} */}
        </section>

        {/* Bottom CTAs */}
        <div className="space-y-3 flex-shrink-0">

          {/* iOS install hint */}
          {showIosHint && (
            <div className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-secondary-container/60 border border-secondary/15">
              <span
                className="material-symbols-outlined text-on-secondary-container flex-shrink-0 mt-0.5"
                style={{ fontSize: '17px', fontVariationSettings: "'FILL' 1" }}
              >
                ios_share
              </span>
              <p className="text-[0.8125rem] font-medium text-on-secondary-container flex-1 leading-snug">
                Tap <span className="font-black">Share</span> then{' '}
                <span className="font-black">Add to Home Screen</span> for the best experience
              </p>
              <button onClick={dismissIosHint} className="flex-shrink-0 active:opacity-60 mt-0.5">
                <span
                  className="material-symbols-outlined text-on-secondary-container/50"
                  style={{ fontSize: '15px' }}
                >
                  close
                </span>
              </button>
            </div>
          )}

          {/* PWA install */}
          {installPrompt && !isInstalled && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-3 px-4 h-[48px] rounded-2xl bg-secondary-container/60 border border-secondary/15 active:scale-[0.97] transition-all"
            >
              <span
                className="material-symbols-outlined text-on-secondary-container flex-shrink-0"
                style={{ fontSize: '17px', fontVariationSettings: "'FILL' 1" }}
              >
                install_mobile
              </span>
              <div className="text-left flex-1">
                <p className="text-[0.8125rem] font-bold text-on-secondary-container leading-none">
                  Add to Home Screen
                </p>
                <p className="text-[0.6875rem] text-on-secondary-container/60 mt-0.5">
                  Works offline · No app store needed
                </p>
              </div>
              <span
                className="material-symbols-outlined text-on-secondary-container/40"
                style={{ fontSize: '16px' }}
              >
                chevron_right
              </span>
            </button>
          )}

          {/* Primary CTA */}
          <Link
            href="/journey/setup"
            className="flex items-center justify-center w-full h-[54px] rounded-full bg-primary text-white font-bold text-[1rem] tracking-tight active:scale-[0.97] transition-all duration-150"
          >
            Start a trip
          </Link>

          {/* Emergency contacts — visible and clear, not hidden */}
          <Link
            href="/contacts"
            className="flex items-center justify-center gap-2 w-full h-[44px] rounded-full border border-outline-variant/30 text-on-surface-variant font-bold text-[0.875rem] tracking-tight active:scale-[0.97] transition-all duration-150"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
            >
              {contactsSet ? 'manage_accounts' : 'person_add'}
            </span>
            {contactsSet ? 'Manage emergency contacts' : 'Set up emergency contacts'}
          </Link>

        </div>

      </main>

    </div>
  )
}