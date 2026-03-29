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
  TRANSFER: 'TRANSFER', // completed a leg, waiting to board next
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

  // Multi-leg state
  const [pendingLegs, setPendingLegs] = useState([])
  const [currentLegIndex, setCurrentLegIndex] = useState(0)
  const [totalLegs, setTotalLegs] = useState(1)
  const [watchToken, setWatchToken] = useState(null)
  const [atPenultimateStop, setAtPenultimateStop] = useState(false)
  const [etaMinutes, setEtaMinutes] = useState(null)
  const [apiDistance, setApiDistance] = useState(null)
  const [routeSteps, setRouteSteps] = useState([])

  const watchIdRef = useRef(null)
  const countdownRef = useRef(null)
  const audioCtxRef = useRef(null)
  const beepTimeoutRef = useRef(null)
  const wakeLockRef = useRef(null)
  const minDistRef = useRef(Infinity)
  const stateRef = useRef(JOURNEY_STATE.IDLE)
  const simDistanceRef = useRef(3000)
  const simIntervalRef = useRef(null)
  // Phase 1 cooldown: timestamp after which Phase 1 can fire again
  // 0 = always allow, Infinity = never allow again (user said "I am awake")
  const phase1CooldownRef = useRef(0)
  const pendingLegsRef = useRef([])
  // ETA API throttle
  const lastEtaFetchRef = useRef(0)
  const lastEtaPositionRef = useRef(null)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { pendingLegsRef.current = pendingLegs }, [pendingLegs])

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
    
    // Trigger Phase 1 "Are you awake?" EXACTLY at 5 minutes remaining based purely on Google API
    const phase1Ready = (etaMinutes !== null && etaMinutes <= 5)
    
    if (cur === JOURNEY_STATE.MONITORING && phase1Ready) {
      if (Date.now() >= phase1CooldownRef.current) {
        phase1CooldownRef.current = 0
        triggerPhase1()
      }
    } else if ((cur === JOURNEY_STATE.MONITORING || cur === JOURNEY_STATE.PHASE_1) && dist <= PHASE_2_METERS) {
      triggerPhase2()
    }
  }, [position, destination, etaMinutes, simMode])

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
      simDistanceRef.current = 3000
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
      // Simulate fast physical movement
      simDistanceRef.current = Math.max(0, simDistanceRef.current - 60)
      const dist = simDistanceRef.current
      setDistanceToStop(dist)
      
      // Simulate a ticking Google API ETA: 200m per minute
      const simulatedEta = Math.ceil(dist / 200)
      setEtaMinutes(simulatedEta)

      if (dist < minDistRef.current) minDistRef.current = dist

      const cur = stateRef.current
      if (cur === JOURNEY_STATE.MISSED || cur === JOURNEY_STATE.IDLE) {
        clearInterval(simIntervalRef.current)
        return
      }
      
      // Only try Phase 1 from MONITORING with cooldown check (Strictly > 5 minutes API logic)
      if (cur === JOURNEY_STATE.MONITORING && simulatedEta <= 5) {
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
    }, 500)

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
      const watchUrl = watchToken ? `${window.location.origin}/watch/${watchToken}` : null
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: primaryContact.phone,
          userName,
          stopName: destination?.name ?? 'their stop',
          lat,
          lng,
          watchUrl,
        }),
      })
    } catch (e) {
      console.error('SMS error:', e)
      setSmsSent(false)
    }
  }, [contacts, userName, destination, position, smsSent])

  const sendSafeArrivalSMS = useCallback(async (stopName) => {
    const primaryContact = contacts[0]
    if (!primaryContact?.phone) return
    try {
      const watchUrl = watchToken ? `${window.location.origin}/watch/${watchToken}` : null
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: primaryContact.phone,
          userName,
          stopName,
          type: 'safe',
          watchUrl,
        }),
      })
    } catch (e) {
      console.error('Safe SMS error:', e)
    }
  }, [contacts, userName, watchToken])

  const sendPushNotify = useCallback(async (type, opts = {}) => {
    const pushToken = contacts[0]?.pushToken
    if (!pushToken) return
    try {
      const watchUrl = opts.watchUrl ?? (watchToken ? `${window.location.origin}/watch/${watchToken}` : null)
      await fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: pushToken,
          type,
          userName,
          stopName: opts.stopName ?? destination?.name ?? 'their stop',
          watchUrl,
        }),
      })
    } catch (e) {
      console.error('Push notify error:', e)
    }
  }, [contacts, userName, destination, watchToken])

  // ── STATE MACHINE ──────────────────────────────────────────────────
  const triggerPhase1 = useCallback(() => {
    setState(JOURNEY_STATE.PHASE_1)
    navigator.vibrate?.([200, 100, 200, 100, 200])
    playAlarm()
  }, [playAlarm])

  const triggerPhase2 = useCallback(() => {
    setState(JOURNEY_STATE.PHASE_2)
    // No alarm — Phase 1 (penultimate stop) is the wake-up alarm.
    // Phase 2 is a silent arrival confirmation.
    navigator.vibrate?.([100, 50, 100])
  }, [])

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
    sendPushNotify('missed', { lat: currentPos?.lat, lng: currentPos?.lng })
    router.push('/missed')
  }, [stopAlarm, sendEmergencySMS, sendPushNotify, router, simMode, destination, position])

  // ── PUBLIC ACTIONS ─────────────────────────────────────────────────

  /**
   * Start a new journey to the given destination.
   * @param {object} dest - destination object
   * @param {object[]} extraLegs - additional legs after the first
   */
  const startJourney = useCallback((dest, extraLegs = []) => {
    const savedContacts = (() => {
      try { return JSON.parse(localStorage.getItem('nudge_contacts') || '[]') } catch { return [] }
    })()
    const savedName = localStorage.getItem('nudge_username') || 'User'

    let token = null
    try {
      token = localStorage.getItem('nudge_watch_token')
      if (!token) {
        token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
        localStorage.setItem('nudge_watch_token', token)
      }
    } catch {}
    setWatchToken(token)
    setPendingLegs(extraLegs)
    pendingLegsRef.current = extraLegs
    setCurrentLegIndex(0)
    setTotalLegs(1 + extraLegs.length)

    setDestination(dest)
    setContacts(savedContacts)
    setUserName(savedName)
    setSmsSent(false)
    setEtaMinutes(null)
    setApiDistance(null)
    setRouteSteps([])
    lastEtaFetchRef.current = 0
    lastEtaPositionRef.current = null
    minDistRef.current = Infinity
    simDistanceRef.current = 3000
    phase1CooldownRef.current = 0
    setState(JOURNEY_STATE.MONITORING)
    acquireWakeLock()

    // Send watch link SMS + Telegram to primary contact
    if (token) {
      const watchUrl = `${window.location.origin}/watch/${token}`
      if (savedContacts[0]?.phone) {
        fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: savedContacts[0].phone,
            userName: savedName,
            type: 'watch',
            watchUrl,
          }),
        }).catch(() => {})
      }
      if (savedContacts[0]?.pushToken) {
        fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: savedContacts[0].pushToken,
            type: 'watch',
            userName: savedName,
            stopName: dest?.name ?? 'their stop',
            watchUrl,
          }),
        }).catch(() => {})
      }
    }

    router.push('/journey/active')
  }, [router])

  /**
   * Dismiss the Phase 1 warning.
   * @param {boolean} delay - true = "Delay 5 mins", false = "I am awake"
   */
  const dismissWarning = useCallback((delay = false) => {
    stopAlarm()
    navigator.vibrate?.(0)
    if (delay) {
      // Max 1-minute snooze — any longer risks missing the stop
      phase1CooldownRef.current = Date.now() + 1 * 60 * 1000
    } else {
      // "I am awake": Phase 1 won't retrigger. Only Phase 2 (200m) will.
      phase1CooldownRef.current = Infinity
    }
    setState(JOURNEY_STATE.MONITORING)
  }, [stopAlarm])

  // Called by BusRouteTimeline when the stop before the destination becomes active
  const setPenultimateReached = useCallback(() => {
    setAtPenultimateStop(true)
    // Force Phase 1 regardless of ETA (no cooldown bypass — just set it)
    if (stateRef.current === JOURNEY_STATE.MONITORING) {
      phase1CooldownRef.current = 0
      triggerPhase1()
    }
  }, [triggerPhase1])

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
    setAtPenultimateStop(false)
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
    setAtPenultimateStop(false)
    router.push('/')
  }, [stopAlarm, router])

  const confirmSafe = useCallback(() => {
    const contactName = contacts[0]?.name ?? null
    const stopName = destination?.name ?? null
    sendSafeArrivalSMS(stopName)
    sendPushNotify('safe', { stopName })
    releaseWakeLock()
    clearInterval(simIntervalRef.current)
    setState(JOURNEY_STATE.IDLE)
    setDestination(null)
    setDistanceToStop(null)
    setSmsSent(false)
    phase1CooldownRef.current = 0
    setSimMode(false)
    setAtPenultimateStop(false)
    const qs = contactName ? `?contact=${encodeURIComponent(contactName)}` : ''
    router.push(`/safe${qs}`)
  }, [router, contacts, destination, sendSafeArrivalSMS, sendPushNotify])

  /**
   * Called when the Phase 2 puzzle is solved.
   * If there are more legs, go to transfer screen; otherwise go to safe screen.
   */
  const completeCurrentLeg = useCallback(() => {
    stopAlarm()
    navigator.vibrate?.(0)
    clearInterval(countdownRef.current)
    clearInterval(simIntervalRef.current)
    if (pendingLegsRef.current.length > 0) {
      releaseWakeLock()
      setState(JOURNEY_STATE.TRANSFER)
      router.push('/journey/transfer')
    } else {
      const stopName = destination?.name ?? null
      sendSafeArrivalSMS(stopName)
      sendPushNotify('safe', { stopName })
      releaseWakeLock()
      const contactName = contacts[0]?.name ?? null
      setState(JOURNEY_STATE.IDLE)
      setDestination(null)
      setDistanceToStop(null)
      setSmsSent(false)
      minDistRef.current = Infinity
      phase1CooldownRef.current = 0
      setSimMode(false)
      const qs = contactName ? `?contact=${encodeURIComponent(contactName)}` : ''
      router.push(`/safe${qs}`)
    }
  }, [stopAlarm, contacts, router, destination, sendSafeArrivalSMS, sendPushNotify])

  /**
   * Board the next leg of a multi-leg journey.
   */
  const boardNextLeg = useCallback(() => {
    const legs = pendingLegsRef.current
    if (!legs.length) return
    const [nextLeg, ...rest] = legs
    setPendingLegs(rest)
    pendingLegsRef.current = rest
    setDestination(nextLeg)
    setCurrentLegIndex(prev => prev + 1)
    setSmsSent(false)
    minDistRef.current = Infinity
    simDistanceRef.current = 3000
    phase1CooldownRef.current = 0
    setState(JOURNEY_STATE.MONITORING)
    acquireWakeLock()
    router.push('/journey/active')
  }, [router])

  const toggleSimMode = useCallback(() => setSimMode((prev) => !prev), [])

  // ── ROUTES API ETA (throttled: every 45s or >30m movement) ──────────
  useEffect(() => {
    if (!position || !destination?.lat) return
    const now = Date.now()
    const last = lastEtaPositionRef.current
    const movedEnough = !last ||
      haversine(position.lat, position.lng, last.lat, last.lng) > 30
    const enoughTime = now - lastEtaFetchRef.current > 45_000
    if (!movedEnough && !enoughTime) return

    lastEtaFetchRef.current = now
    lastEtaPositionRef.current = position

    fetch('/api/eta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat: position.lat,
        originLng: position.lng,
        destLat: destination.lat,
        destLng: destination.lng,
      }),
    })
      .then(r => r.json())
      .then(data => { 
        if (data.durationMinutes) setEtaMinutes(data.durationMinutes) 
        if (data.distanceMeters) setApiDistance(data.distanceMeters)
        if (data.routeSteps) setRouteSteps(data.routeSteps) 
      })
      .catch(() => {})
  }, [position, destination, simMode])

  // ── WATCH STATE PUBLISHER ──────────────────────────────────────────
  useEffect(() => {
    if (!watchToken || state === JOURNEY_STATE.IDLE) return
    const payload = {
      token: watchToken,
      state,
      destinationName: destination?.name ?? null,
      distanceToStop,
      apiDistance,
      etaMinutes,
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      destLat: destination?.lat ?? null,
      destLng: destination?.lng ?? null,
      userName,
      currentLegIndex,
      totalLegs,
      simMode,
      routeSteps,
    }
    fetch('/api/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }, [state, distanceToStop, position, watchToken])

  return (
    <JourneyContext.Provider value={{
      state,
      destination,
      position,
      distanceToStop,
      apiDistance,
      etaMinutes,
      routeSteps,
      countdown,
      contacts,
      userName,
      smsSent,
      simMode,
      pendingLegs,
      currentLegIndex,
      totalLegs,
      watchToken,
      JOURNEY_STATE,
      startJourney,
      dismissWarning,
      dismissAlarm,
      endJourney,
      confirmSafe,
      toggleSimMode,
      triggerMissed,
      atPenultimateStop,
      setPenultimateReached,
      completeCurrentLeg,
      boardNextLeg,
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
