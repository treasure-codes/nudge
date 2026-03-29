'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SafePage() {
  return (
    <Suspense fallback={<div className="bg-surface-container-lowest min-h-dvh max-w-[430px] mx-auto" />}>
      <SafeContent />
    </Suspense>
  )
}

function SafeContent() {
  const contact = useSearchParams().get('contact')

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col items-center justify-center px-8 text-center max-w-[430px] mx-auto">

      {/* Check mark */}
      <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center mb-10 animate-check-in">
        <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}>
          check
        </span>
      </div>

      <h1 className="text-[3rem] font-black tracking-tighter text-primary mb-4 animate-fade-up">
        You're all good.
      </h1>
      <p className="text-on-surface-variant text-[1.0625rem] leading-relaxed mb-14 max-w-[260px] animate-fade-up">
        {contact
          ? <>We've let <span className="text-on-surface font-bold">{contact}</span> know you're safe.</>
          : 'Your journey is complete. Rest easy.'}
      </p>

      <div className="w-full max-w-sm space-y-3 animate-fade-up">
        <Link
          href="/journey/setup"
          className="flex items-center justify-center w-full h-[56px] rounded-full bg-primary text-white font-bold text-[1.0625rem] tracking-tight active:scale-[0.97] transition-all"
        >
          Start a trip
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center w-full h-[50px] text-[1rem] font-medium text-on-surface-variant hover:text-primary transition-colors"
        >
          Go home
        </Link>
      </div>

    </div>
  )
}
