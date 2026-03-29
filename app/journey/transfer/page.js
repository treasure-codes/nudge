'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

const TRANSFER_SECS = 10 * 60

export default function TransferPage() {
  const router = useRouter()
  const { state, destination, pendingLegs, currentLegIndex, totalLegs, boardNextLeg, endJourney } = useJourney()
  const [timeLeft, setTimeLeft] = useState(TRANSFER_SECS)

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/')
    if (state === JOURNEY_STATE.MISSED) router.replace('/missed')
    if ([JOURNEY_STATE.MONITORING, JOURNEY_STATE.PHASE_1, JOURNEY_STATE.PHASE_2].includes(state))
      router.replace('/journey/active')
  }, [state, router])

  useEffect(() => {
    if (state !== JOURNEY_STATE.TRANSFER) return
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000)
    return () => clearInterval(t)
  }, [state])

  if (state !== JOURNEY_STATE.TRANSFER) return null

  const nextLeg = pendingLegs?.[0]
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const minsLeft = Math.floor(timeLeft / 60)

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="bg-white w-full sticky top-0 z-50 flex items-center justify-between px-8 py-6">
        <button onClick={endJourney} className="p-2 -ml-2 active:scale-90 transition-transform hover:bg-surface-container rounded-full">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>close</span>
        </button>
        <h1 className="font-black uppercase tracking-widest text-sm text-primary">NUDGE</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-8 pt-10 pb-40">

        {/* Leg indicator */}
        <div className="mb-4">
          <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
            Leg {(currentLegIndex ?? 0) + 1} of {totalLegs ?? 2}
          </span>
        </div>

        {/* Hero heading */}
        <h1 className="text-[3.5rem] leading-[1.05] font-black tracking-tighter text-primary mb-12">
          You've reached{' '}
          <span className="underline decoration-secondary-container decoration-4 underline-offset-2">
            {destination?.name ?? 'your transfer stop'}
          </span>
        </h1>

        {/* Transfer buffer card */}
        <div className="bg-surface-container rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>schedule</span>
            <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">Transfer Window</span>
          </div>
          <p className="text-[1rem] font-medium text-on-surface-variant mb-2">Your next bus leaves in</p>
          <p className="text-[3.5rem] font-black tracking-tighter leading-none text-primary">{mins}:{secs}</p>
        </div>

        {/* Next leg card */}
        {nextLeg && (
          <div className="bg-surface-container rounded-2xl p-6 flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
              </div>
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Next Stop</p>
                <h3 className="text-[1.125rem] font-bold text-primary">{nextLeg.name}</h3>
                {nextLeg.address && (
                  <p className="text-[0.8125rem] text-on-surface-variant font-light">{nextLeg.address}</p>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/40">chevron_right</span>
          </div>
        )}

        {/* Watcher notice */}
        <div className="bg-surface-container-low rounded-2xl p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-secondary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-on-surface-variant">
            Your Watcher is active and will be alerted if you don't board within {minsLeft} minutes.
          </p>
        </div>

      </main>

      {/* Fixed bottom */}
      <div className="fixed bottom-0 left-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 px-8 pb-12 pt-4 bg-white/90 backdrop-blur-xl space-y-3">
        <button
          onClick={boardNextLeg}
          className="w-full h-[56px] rounded-full bg-primary text-white font-bold text-[1.0625rem] active:scale-[0.97] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        >
          I've boarded
        </button>
        <p className="text-center text-[0.8125rem] text-on-surface-variant font-medium italic">
          Not boarded? Your Watcher will be notified in {minsLeft} min.
        </p>
        <button onClick={endJourney} className="w-full text-center text-[0.8125rem] text-outline py-1 active:text-on-surface-variant transition-colors">
          End journey
        </button>
      </div>

    </div>
  )
}
