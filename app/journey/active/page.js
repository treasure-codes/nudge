'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

export default function JourneyActivePage() {
  const router = useRouter()
  const {
    state,
    destination,
    distanceToStop,
    etaMinutes,
    countdown,
    simMode,
    endJourney,
    dismissWarning,
    dismissAlarm,
    toggleSimMode,
  } = useJourney()

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/journey/setup')
    if (state === JOURNEY_STATE.MISSED) router.replace('/missed')
  }, [state, router])

  if (state === JOURNEY_STATE.IDLE || state === JOURNEY_STATE.MISSED) return null

  if (state === JOURNEY_STATE.PHASE_1) {
    return (
      <Phase1Screen
        etaMinutes={etaMinutes}
        distanceToStop={distanceToStop}
        dismissWarning={dismissWarning}
      />
    )
  }
  if (state === JOURNEY_STATE.PHASE_2) {
    return <Phase2Screen countdown={countdown} dismissAlarm={dismissAlarm} />
  }

  return (
    <MonitoringScreen
      destination={destination}
      distanceToStop={distanceToStop}
      etaMinutes={etaMinutes}
      simMode={simMode}
      endJourney={endJourney}
      toggleSimMode={toggleSimMode}
    />
  )
}

// ─── MONITORING ────────────────────────────────────────────────────────────────
function MonitoringScreen({ destination, distanceToStop, etaMinutes, simMode, endJourney, toggleSimMode }) {
  return (
    <div className="bg-white text-primary min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-outline-variant/10 flex items-center justify-between px-6 py-5 z-50">
        <button onClick={endJourney} className="p-1 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-black">close</span>
        </button>
        <span className="font-black uppercase tracking-[0.2em] text-xs text-black">NUDGE</span>
        <div className="w-8" />
      </header>

      <main className="flex-grow flex flex-col px-6 pt-10 pb-8">
        {/* ETA + Destination */}
        <section className="mb-16">
          <p className="font-bold text-[0.7rem] uppercase tracking-widest text-on-surface-variant mb-1">
            Arrival In
          </p>
          <h2 className="text-[3.25rem] font-black tracking-tighter leading-none text-primary mb-8">
            {etaMinutes !== null ? `${etaMinutes} min${etaMinutes === 1 ? '' : 's'}` : '— mins'}
          </h2>

          <p className="font-bold text-[0.7rem] uppercase tracking-widest text-on-surface-variant mb-1">
            Destination
          </p>
          <h3 className="text-[1.75rem] font-bold tracking-tight text-primary leading-tight">
            {destination?.name ?? '—'}
          </h3>
          {distanceToStop !== null && (
            <p className="text-on-surface-variant text-sm mt-2">
              {distanceToStop >= 1000
                ? `${(distanceToStop / 1000).toFixed(1)} km away`
                : `${distanceToStop} m away`}
            </p>
          )}
        </section>

        {/* Pulsing indicator */}
        <section className="flex flex-col items-center justify-center flex-grow py-8">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-44 h-44 bg-secondary-container/25 rounded-full animate-pulse-soft" />
            <div className="absolute w-56 h-56 bg-secondary-container/10 rounded-full animate-pulse-soft" style={{ animationDelay: '0.5s' }} />
            <div className="relative w-28 h-28 bg-secondary-container rounded-full flex items-center justify-center">
              <span
                className="material-symbols-outlined text-on-secondary-container"
                style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
              >
                notifications_active
              </span>
            </div>
          </div>
          <div className="mt-10 text-center">
            <span className="font-bold text-[0.7rem] uppercase tracking-widest text-secondary block mb-2">
              Monitoring Active
            </span>
            <p className="text-on-surface-variant text-sm max-w-[220px] mx-auto leading-relaxed">
              {`We'll alert you 1 km before your stop.`}
            </p>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-3 pt-6">
          <button
            onClick={toggleSimMode}
            className={`w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              simMode
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', fontVariationSettings: "'FILL' 1" }}>
              {simMode ? 'stop_circle' : 'play_circle'}
            </span>
            {simMode ? 'Demo Mode Running…' : 'Run Demo'}
          </button>
          <button
            onClick={endJourney}
            className="w-full h-14 rounded-full bg-primary text-white font-bold text-base flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            End Journey
          </button>
        </section>
      </main>
    </div>
  )
}

// ─── PHASE 1 — GENTLE WARNING ──────────────────────────────────────────────────
function Phase1Screen({ etaMinutes, distanceToStop, dismissWarning }) {
  // Only offer delay if there's more than 1 minute left (meaningless otherwise)
  const showDelay = etaMinutes !== null && etaMinutes > 1

  return (
    <div className="bg-white text-on-surface min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white flex items-center gap-3 px-6 py-6 border-b border-outline-variant/10">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
        >
          warning
        </span>
        <span className="font-black uppercase tracking-widest text-sm">WAKE UP SOON</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-between px-6 py-10">
        {/* Bell + Distance */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="mb-8 animate-bell">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: '100px', fontVariationSettings: "'FILL' 1" }}
            >
              notifications_active
            </span>
          </div>

          <h1 className="text-[2.75rem] font-black tracking-tighter text-primary text-center mb-3">
            Are you awake?
          </h1>

          {distanceToStop !== null && (
            <p className="text-[1.5rem] font-bold text-secondary text-center">
              {distanceToStop >= 1000
                ? `${(distanceToStop / 1000).toFixed(1)} km`
                : `${distanceToStop} m`}{' '}
              to your stop
            </p>
          )}

          <p className="text-on-surface-variant text-base text-center mt-4 max-w-[260px] leading-relaxed">
            Tap below or the alarm will sound automatically.
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={() => dismissWarning(false)}
            className="h-14 w-full bg-secondary-container rounded-full flex items-center justify-center active:scale-[0.98] transition-all shadow-sm"
          >
            <span className="text-on-secondary-container font-bold text-lg">
              I am awake
            </span>
          </button>

          {showDelay && (
            <button
              onClick={() => dismissWarning(true)}
              className="h-14 w-full bg-surface-container-high rounded-full flex items-center justify-center active:scale-[0.98] transition-all"
            >
              <span className="text-on-surface font-bold text-base">
                Remind me in 5 minutes
              </span>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── PHASE 2 — FULL ALARM ──────────────────────────────────────────────────────
function Phase2Screen({ countdown, dismissAlarm }) {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 bg-white/90 backdrop-blur-xl border-b border-outline-variant/10">
        <span className="font-black tracking-[0.2em] uppercase text-xs text-black">NUDGE</span>
        <span className="material-symbols-outlined text-black" style={{ fontSize: '20px' }}>
          notifications_active
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-between px-6 pt-10 pb-10 text-center">
        {/* Title */}
        <div className="w-full">
          <h1 className="text-[3.25rem] font-black leading-none tracking-tighter text-black uppercase mb-1">
            WAKE UP!
          </h1>
          <p className="font-bold uppercase tracking-widest text-on-surface-variant text-xs">
            Alarm Active
          </p>
        </div>

        {/* Pulsing alarm icon + countdown */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-56 h-56 bg-primary/5 rounded-full animate-pulse-alarm" />
            <div className="absolute w-44 h-44 bg-primary/8 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="relative w-36 h-36 bg-primary rounded-full flex items-center justify-center z-10">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '52px', fontVariationSettings: "'FILL' 1" }}
              >
                alarm
              </span>
            </div>
          </div>

          <p className="text-[5rem] font-black tracking-tighter text-primary leading-none">
            {countdown}
          </p>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-2">
            seconds until your contact is alerted
          </p>
        </div>

        {/* Action */}
        <div className="w-full space-y-3">
          <p className="text-error text-sm font-semibold">
            Audio playing at maximum volume.
          </p>
          <button
            onClick={dismissAlarm}
            className="w-full h-14 bg-primary text-white rounded-full font-bold text-base uppercase tracking-widest flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            Turn Off Alarm
          </button>
        </div>
      </main>
    </div>
  )
}
