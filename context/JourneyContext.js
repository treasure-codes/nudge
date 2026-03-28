'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { haversine } from '@/lib/haversine'

export const JOURNEY_STATE = {
  IDLE: 'IDLE',
  MONITORING: 'MONITORING',
  PHASE_1: 'PHASE_1',   // 1000m — gentle warning
  PHASE_2: 'PHASE_2',   // 200m  — full alarm + countdown
  MISSED: 'MISSED',     // ignored alarm / passed stop
}

const PHASE_1_METERS = 1000
const PHASE_2_METERS = 200
const PHASE_2_COUNTDOWN_SECS = 60
const MISSED_OVERSHOOT_METERS = 500

const JourneyContext = createContext(null)

export function JourneyProvider({ children }) {
  const router = useRouter()

  const [state, setState] = useState(JOURNEY_STATE.IDLE)
  const [destination, setDestination] = useState(null)
  const [position, setPosition] = useState(null)
  const [distanceToStop, setDistanceToStop] = useState(null)
  const [countdown, setCountdown] = useState(PHASE_2_COUNTDOWN_SECS)
  const [contacts, setContacts] = useState([])
  const [userName, setUserName] = useState('User')
  const [smsSent, setSmsSent] = useState(false)
  const [simMode, setSimMode] = useState(false)

  const watchIdRef = useRef(null)
  const countdownRef = useRef(null)
  const audioCtxRef = useRef(null)
  const beepTimeoutRef = useRef(null)
  const wakeLockRef = useRef(null)
  const minDistRef = useRef(Infinity)
  const stateRef = useRef(JOURNEY_STATE.IDLE)
  const simDistanceRef = useRef(2000)
  const simIntervalRef = useRef(null)
  // Phase 1 cooldown: timestamp after which Phase 1 can fire again
  // 0 = always allow, Infinity = never allow again (user said "I am awake")
  const phase1CooldownRef = useRef(0)

  useEffect(() => { stateRef.current = state }, [state])

  // Load contacts + username
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('nudge_contacts')
      if (saved) setContacts(JSON.parse(saved))
      const savedName = localStorage.getItem('nudge_username')
      if (savedName) setUserName(savedName)
    } catch {}
  }, [])

  // ── GPS TRACKING ───────────────────────────────────────────────────
  useEffect(() => {
    const active = [
      JOURNEY_STATE.MONITORING,
      JOURNEY_STATE.PHASE_1,
      JOURNEY_STATE.PHASE_2,
      JOURNEY_STATE.MISSED,
    ].includes(state)

    if (!active || simMode) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      return
    }
    if (!navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    )
    return () => {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [state, simMode])

  // ── DISTANCE → STATE TRANSITIONS (real GPS) ───────────────────────
  useEffect(() => {
    if (!position || !destination || simMode) return
    const dist = haversine(position.lat, position.lng, destination.lat, destination.lng)
    setDistanceToStop(Math.round(dist))
    if (dist < minDistRef.current) minDistRef.current = dist

    const cur = stateRef.current
    if (cur === JOURNEY_STATE.IDLE || cur === JOURNEY_STATE.MISSED) return

    if (minDistRef.current < PHASE_2_METERS && dist > minDistRef.current + MISSED_OVERSHOOT_METERS) {
      triggerMissed()
      return
    }
    if (cur === JOURNEY_STATE.MONITORING && dist <= PHASE_1_METERS) {
      if (Date.now() >= phase1CooldownRef.current) {
        phase1CooldownRef.current = 0
        triggerPhase1()
      }
    } else if ((cur === JOURNEY_STATE.MONITORING || cur === JOURNEY_STATE.PHASE_1) && dist <= PHASE_2_METERS) {
      triggerPhase2()
    }
  }, [position, destination])

  // ── PHASE 2 COUNTDOWN ──────────────────────────────────────────────
  useEffect(() => {
    if (state !== JOURNEY_STATE.PHASE_2) return
    setCountdown(PHASE_2_COUNTDOWN_SECS)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          triggerMissed()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [state])

  // ── SIMULATION: reset distance only when sim first turns on ────────
  useEffect(() => {
    if (simMode) {
      simDistanceRef.current = 2000
      minDistRef.current = Infinity
    } else {
      clearInterval(simIntervalRef.current)
      simIntervalRef.current = null
    }
  }, [simMode])

  // ── SIMULATION: tick (continues without resetting distance) ────────
  useEffect(() => {
    if (!simMode) return
    const active = [
      JOURNEY_STATE.MONITORING,
      JOURNEY_STATE.PHASE_1,
      JOURNEY_STATE.PHASE_2,
    ].includes(state)
    if (!active) {
      clearInterval(simIntervalRef.current)
      return
    }

    clearInterval(simIntervalRef.current)
    simIntervalRef.current = setInterval(() => {
      simDistanceRef.current = Math.max(0, simDistanceRef.current - 60)
      const dist = simDistanceRef.current
      setDistanceToStop(dist)
      if (dist < minDistRef.current) minDistRef.current = dist

      const cur = stateRef.current
      if (cur === JOURNEY_STATE.MISSED || cur === JOURNEY_STATE.IDLE) {
        clearInterval(simIntervalRef.current)
        return
      }
      // Only try Phase 1 from MONITORING with cooldown check
      if (cur === JOURNEY_STATE.MONITORING && dist <= PHASE_1_METERS) {
        if (Date.now() >= phase1CooldownRef.current) {
          phase1CooldownRef.current = 0
          triggerPhase1()
        }
      } else if (
        (cur === JOURNEY_STATE.MONITORING || cur === JOURNEY_STATE.PHASE_1) &&
        dist <= PHASE_2_METERS
      ) {
        triggerPhase2()
      }
    }, 700)

    return () => clearInterval(simIntervalRef.current)
  }, [simMode, state])

  // ── FIRE-ALARM SOUND (Web Audio API) ──────────────────────────────
  const playAlarm = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      const schedulePattern = () => {
        if (!audioCtxRef.current) return
        const now = ctx.currentTime
        // 6 alternating tones: 960Hz / 1200Hz — classic fire alarm
        for (let i = 0; i < 6; i++) {
          const freq = i % 2 === 0 ? 960 : 1200
          const t = now + i * 0.17
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'sawtooth'
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0, t)
          gain.gain.linearRampToValueAtTime(0.9, t + 0.01)
          gain.gain.setValueAtTime(0.9, t + 0.14)
          gain.gain.linearRampToValueAtTime(0, t + 0.17)
          osc.start(t)
          osc.stop(t + 0.17)
        }
        // Next pattern: 6 * 170ms tones + 300ms pause = ~1320ms
        beepTimeoutRef.current = setTimeout(schedulePattern, 6 * 170 + 300)
      }

      schedulePattern()
    } catch (e) {
      console.warn('Audio error:', e)
    }
  }, [])

  const stopAlarm = useCallback(() => {
    if (beepTimeoutRef.current) {
      clearTimeout(beepTimeoutRef.current)
      beepTimeoutRef.current = null
    }
    try {
      audioCtxRef.current?.close()
      audioCtxRef.current = null
    } catch {}
  }, [])

  // ── WAKE LOCK ──────────────────────────────────────────────────────
  const acquireWakeLock = async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch {}
  }
  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  // ── SMS ────────────────────────────────────────────────────────────
  const sendEmergencySMS = useCallback(async (pos) => {
    if (smsSent) return
    const primaryContact = contacts[0]
    if (!primaryContact) return
    const lat = pos?.lat ?? position?.lat
    const lng = pos?.lng ?? position?.lng
    if (!lat || !lng) return
    setSmsSent(true)
    try {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: primaryContact.phone,
          userName,
          stopName: destination?.name ?? 'their stop',
          lat,
          lng,
        }),
      })
    } catch (e) {
      console.error('SMS error:', e)
      setSmsSent(false)
    }
  }, [contacts, userName, destination, position, smsSent])

  // ── STATE MACHINE ──────────────────────────────────────────────────
  const triggerPhase1 = useCallback(() => {
    setState(JOURNEY_STATE.PHASE_1)
    navigator.vibrate?.([200, 100, 200, 100, 200])
  }, [])

  const triggerPhase2 = useCallback(() => {
    setState(JOURNEY_STATE.PHASE_2)
    navigator.vibrate?.([500, 150, 500, 150, 500, 150, 500, 150, 500])
    playAlarm()
  }, [playAlarm])

  const triggerMissed = useCallback(async () => {
    setState(JOURNEY_STATE.MISSED)
    stopAlarm()
    navigator.vibrate?.(0)
    clearInterval(countdownRef.current)
    clearInterval(simIntervalRef.current)

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Please wake up! You have missed your stop!')
      u.volume = 1
      u.rate = 1.1
      u.lang = 'en-US'
      window.speechSynthesis.speak(u)
    }

    const currentPos = simMode
      ? (destination ? { lat: destination.lat + 0.005, lng: destination.lng + 0.003 } : position)
      : position

    await sendEmergencySMS(currentPos)
    router.push('/missed')
  }, [stopAlarm, sendEmergencySMS, router, simMode, destination, position])

  // ── PUBLIC ACTIONS ─────────────────────────────────────────────────

  /**
   * Start a new journey to the given destination.
   */
  const startJourney = useCallback((dest) => {
    const savedContacts = (() => {
      try { return JSON.parse(localStorage.getItem('nudge_contacts') || '[]') } catch { return [] }
    })()
    const savedName = localStorage.getItem('nudge_username') || 'User'

    setDestination(dest)
    setContacts(savedContacts)
    setUserName(savedName)
    setSmsSent(false)
    minDistRef.current = Infinity
    simDistanceRef.current = 2000
    phase1CooldownRef.current = 0
    setState(JOURNEY_STATE.MONITORING)
    acquireWakeLock()
    router.push('/journey/active')
  }, [router])

  /**
   * Dismiss the Phase 1 warning.
   * @param {boolean} delay - true = "Delay 5 mins", false = "I am awake"
   */
  const dismissWarning = useCallback((delay = false) => {
    if (delay) {
      // Cooldown: Phase 1 can retrigger in 5 minutes
      phase1CooldownRef.current = Date.now() + 5 * 60 * 1000
    } else {
      // "I am awake": Phase 1 won't retrigger. Only Phase 2 (200m) will.
      phase1CooldownRef.current = Infinity
    }
    setState(JOURNEY_STATE.MONITORING)
  }, [])

  const dismissAlarm = useCallback(() => {
    stopAlarm()
    navigator.vibrate?.(0)
    clearInterval(countdownRef.current)
    clearInterval(simIntervalRef.current)
    releaseWakeLock()
    setState(JOURNEY_STATE.IDLE)
    setDestination(null)
    setDistanceToStop(null)
    minDistRef.current = Infinity
    phase1CooldownRef.current = 0
    setSimMode(false)
    router.push('/')
  }, [stopAlarm, router])

  const endJourney = useCallback(() => {
    stopAlarm()
    navigator.vibrate?.(0)
    clearInterval(countdownRef.current)
    clearInterval(simIntervalRef.current)
    releaseWakeLock()
    setState(JOURNEY_STATE.IDLE)
    setDestination(null)
    setDistanceToStop(null)
    setSmsSent(false)
    minDistRef.current = Infinity
    phase1CooldownRef.current = 0
    setSimMode(false)
    router.push('/')
  }, [stopAlarm, router])

  const confirmSafe = useCallback(() => {
    releaseWakeLock()
    clearInterval(simIntervalRef.current)
    setState(JOURNEY_STATE.IDLE)
    setDestination(null)
    setDistanceToStop(null)
    setSmsSent(false)
    phase1CooldownRef.current = 0
    setSimMode(false)
    router.push('/')
  }, [router])

  const toggleSimMode = useCallback(() => setSimMode((prev) => !prev), [])

  const etaMinutes = distanceToStop !== null
    ? Math.max(1, Math.round(distanceToStop / 500))
    : null

  return (
    <JourneyContext.Provider value={{
      state,
      destination,
      position,
      distanceToStop,
      etaMinutes,
      countdown,
      contacts,
      userName,
      smsSent,
      simMode,
      JOURNEY_STATE,
      startJourney,
      dismissWarning,
      dismissAlarm,
      endJourney,
      confirmSafe,
      toggleSimMode,
      setContacts,
      setUserName,
    }}>
      {children}
    </JourneyContext.Provider>
  )
}

export function useJourney() {
  const ctx = useContext(JourneyContext)
  if (!ctx) throw new Error('useJourney must be inside JourneyProvider')
  return ctx
}
