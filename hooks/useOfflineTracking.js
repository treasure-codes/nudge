/**
 * useOfflineTracking.js
 *
 * Replaces the /api/eta polling block in JourneyContext.
 *
 * Strategy:
 *   1. When a routeStops sequence is available (loaded from sessionStorage or API),
 *      use computeOfflineEta() — pure GPS + Haversine, zero network.
 *   2. If no stop sequence is available (user skipped route selection),
 *      fall back to straight Haversine distance to destination only.
 *
 * This hook fires on every GPS position update. The OS throttles GPS
 * updates to ~1-5s intervals naturally, so we get free rate-limiting.
 */

import { useEffect, useRef } from 'react'
import { computeOfflineEta } from '@/lib/offlineEta'
import { haversine } from '@/lib/haversine'

/**
 * @param {object} opts
 * @param {{ lat: number, lng: number } | null} opts.position         - current GPS position
 * @param {{ lat: number, lng: number } | null} opts.destination      - active destination
 * @param {Array}                               opts.routeStops       - GTFS stop sequence (may be empty)
 * @param {string|number}                       opts.routeNumber      - primary line number for speed lookup
 * @param {boolean}                             opts.simMode          - whether simulation mode is active
 * @param {string}                              opts.journeyState     - current JOURNEY_STATE value
 * @param {string}                              opts.IDLE_STATE       - the IDLE state string constant
 * @param {function}                            opts.setEtaMinutes
 * @param {function}                            opts.setApiDistance
 * @param {function}                            opts.triggerPhase1    - call to fire the wake-up alarm
 * @param {function}                            opts.triggerPhase2    - call to fire the arrival alarm
 * @param {function}                            opts.setPenultimateReached
 * @param {object}                              opts.phase1CooldownRef - ref({ current: timestamp })
 * @param {object}                              opts.stateRef          - ref({ current: JOURNEY_STATE })
 * @param {string}                              opts.MONITORING_STATE
 * @param {string}                              opts.PHASE_1_STATE
 */
export function useOfflineTracking({
  position,
  destination,
  routeStops,
  routeNumber,
  simMode,
  journeyState,
  IDLE_STATE,
  MONITORING_STATE,
  PHASE_1_STATE,
  setEtaMinutes,
  setApiDistance,
  triggerPhase1,
  triggerPhase2,
  setPenultimateReached,
  phase1CooldownRef,
  stateRef,
}) {
  const phase1FiredRef = useRef(false)

  // Reset phase1 fired flag whenever journey state resets to monitoring
  useEffect(() => {
    if (journeyState === MONITORING_STATE) {
      phase1FiredRef.current = false
    }
  }, [journeyState, MONITORING_STATE])

  useEffect(() => {
    if (!position || !destination?.lat || simMode) return

    const cur = stateRef.current
    if (cur === IDLE_STATE) return

    // ── Path A: GTFS stop sequence available — full offline ETA ──────────────
    if (routeStops?.length >= 2) {
      const result = computeOfflineEta(
        position.lat, position.lng,
        routeStops,
        routeNumber
      )

      setEtaMinutes(result.etaMinutes)
      setApiDistance(result.remainingDistanceM)

      // Phase 1 — user is at the penultimate stop (pull the rope moment)
      if (
        result.shouldAlertPhase1 &&
        !phase1FiredRef.current &&
        cur === MONITORING_STATE &&
        Date.now() >= (phase1CooldownRef.current ?? 0)
      ) {
        phase1FiredRef.current = true
        phase1CooldownRef.current = 0
        setPenultimateReached()
        triggerPhase1()
      }

      // Phase 2 — physically within arrival radius of destination stop
      if (
        result.shouldAlertPhase2 &&
        (cur === MONITORING_STATE || cur === PHASE_1_STATE)
      ) {
        triggerPhase2()
      }

      return
    }

    // ── Path B: No stop sequence — pure Haversine fallback ───────────────────
    const distM = haversine(position.lat, position.lng, destination.lat, destination.lng)
    setApiDistance(Math.round(distM))

    // Rough ETA using Nashville default bus speed (5.5 m/s)
    const etaMins = Math.round(distM / 5.5 / 60)
    setEtaMinutes(etaMins)

    // Phase 1 — within 800m AND 5 minutes estimated
    if (
      etaMins <= 5 &&
      distM <= 800 &&
      !phase1FiredRef.current &&
      cur === MONITORING_STATE &&
      Date.now() >= (phase1CooldownRef.current ?? 0)
    ) {
      phase1FiredRef.current = true
      phase1CooldownRef.current = 0
      triggerPhase1()
    }

    // Phase 2 — within 200m of the raw destination coordinates
    if (distM <= 200 && (cur === MONITORING_STATE || cur === PHASE_1_STATE)) {
      triggerPhase2()
    }

  }, [
    position,
    destination,
    routeStops,
    routeNumber,
    simMode,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    journeyState,
  ])
}
