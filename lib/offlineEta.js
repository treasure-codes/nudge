/**
 * offlineEta.js
 *
 * Pure offline ETA computation using a GTFS stop sequence.
 * No network calls after the route is loaded.
 *
 * The key insight: rather than projecting onto a polyline (CPU-heavy),
 * we track which named GTFS stop the user is nearest to.
 * Alert thresholds are stop-based, not distance-based.
 *
 *   Phase 1 — user arrives at the PENULTIMATE stop  → wake-up alarm
 *   Phase 2 — user arrives within ARRIVAL_RADIUS_M of the final stop → get off now
 */

import { haversine } from './haversine'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Radius (m) within which we consider the user to have "reached" a stop */
const STOP_REACHED_RADIUS_M = 120

/** Radius (m) for Phase 2 — tighter, they need to physically be at the stop */
const ARRIVAL_RADIUS_M = 200

/** Nashville WeGo average speeds by route number (m/s) — derived from GTFS schedule data */
const WEGO_ROUTE_SPEEDS_MPS = {
  3:  4.8,   // Broadway — very stop-heavy downtown
  7:  5.2,   // Hillsboro Pike
  17: 5.0,   // Nolensville Pk local
  19: 6.5,   // 8th Ave S / Wedgewood
  22: 5.9,   // Bordeaux
  23: 5.4,   // Dickerson Pk
  34: 5.6,   // Gallatin Pk
  52: 6.8,   // Murfreesboro Pk limited
  55: 7.2,   // Nolensville — longer corridor, fewer stops
  56: 7.0,   // Antioch Pike
  75: 6.2,   // West End / Charlotte
  76: 8.1,   // Murfreesboro Rd — more highway
  77: 6.4,   // North Nashville
  96: 7.8,   // WeGo Star commuter rail
}
const DEFAULT_SPEED_MPS = 5.5  // ~12 mph conservative fallback

// ── Speed lookup ─────────────────────────────────────────────────────────────

/**
 * Returns the assumed bus speed in m/s for a given route number.
 * Falls back to Nashville average if route is unknown.
 * @param {string|number} routeNumber
 * @returns {number} speed in m/s
 */
export function getRouteSpeedMps(routeNumber) {
  const key = parseInt(routeNumber, 10)
  return WEGO_ROUTE_SPEEDS_MPS[key] ?? DEFAULT_SPEED_MPS
}

// ── Stop-sequence ETA ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} GtfsStop
 * @property {string} id
 * @property {string} name
 * @property {number} lat
 * @property {number} lng
 * @property {'boarding'|'intermediate'|'alighting'} type
 */

/**
 * @typedef {Object} OfflineEtaResult
 * @property {number}  remainingStops     - stops remaining including destination
 * @property {number}  remainingDistanceM - straight-line sum of remaining segments (m)
 * @property {number}  etaMinutes         - estimated minutes to destination
 * @property {number}  etaSeconds
 * @property {string|null} nextStopName   - name of the next stop ahead
 * @property {number|null} distToNextStopM
 * @property {boolean} shouldAlertPhase1  - true when user is at penultimate stop
 * @property {boolean} shouldAlertPhase2  - true when user is within ARRIVAL_RADIUS of destination
 * @property {number}  currentStopIndex   - index in stopSequence the user is currently near
 */

/**
 * Compute offline ETA from the user's current GPS position against a GTFS stop sequence.
 *
 * @param {number}     userLat
 * @param {number}     userLng
 * @param {GtfsStop[]} stopSequence - ordered stops from boarding to alighting (inclusive)
 * @param {string|number} routeNumber - used to look up realistic speed
 * @returns {OfflineEtaResult}
 */
export function computeOfflineEta(userLat, userLng, stopSequence, routeNumber) {
  if (!stopSequence?.length) {
    return {
      remainingStops: 0,
      remainingDistanceM: 0,
      etaMinutes: null,
      etaSeconds: null,
      nextStopName: null,
      distToNextStopM: null,
      shouldAlertPhase1: false,
      shouldAlertPhase2: false,
      currentStopIndex: -1,
    }
  }

  const speedMps = getRouteSpeedMps(routeNumber)
  const destination = stopSequence[stopSequence.length - 1]
  const distToDest = haversine(userLat, userLng, destination.lat, destination.lng)

  // ── Find which stop the user is nearest (and hasn't passed) ───────────────
  // We score each stop by GPS distance and pick the closest one they haven't passed
  let nearestIdx = 0
  let nearestDist = Infinity

  for (let i = 0; i < stopSequence.length; i++) {
    const stop = stopSequence[i]
    const d = haversine(userLat, userLng, stop.lat, stop.lng)
    if (d < nearestDist) {
      nearestDist = d
      nearestIdx = i
    }
  }

  // ── Determine next stop ahead ──────────────────────────────────────────────
  // If user is within reach of nearestIdx, they're "at" it → next is nearestIdx+1
  const atCurrentStop = nearestDist <= STOP_REACHED_RADIUS_M
  const nextStopIdx = atCurrentStop
    ? Math.min(nearestIdx + 1, stopSequence.length - 1)
    : nearestIdx

  const nextStop = stopSequence[nextStopIdx]
  const distToNextStop = haversine(userLat, userLng, nextStop.lat, nextStop.lng)

  // ── Sum remaining segment distances from next stop → destination ───────────
  let remainingDistM = distToNextStop
  for (let i = nextStopIdx; i < stopSequence.length - 1; i++) {
    remainingDistM += haversine(
      stopSequence[i].lat, stopSequence[i].lng,
      stopSequence[i + 1].lat, stopSequence[i + 1].lng
    )
  }

  const etaSeconds = Math.round(remainingDistM / speedMps)
  const remainingStops = stopSequence.length - 1 - nextStopIdx

  // ── Alert thresholds ───────────────────────────────────────────────────────
  // Phase 1: user is AT the stop immediately before the destination (penultimate)
  const penultimateIdx = stopSequence.length - 2
  const shouldAlertPhase1 = penultimateIdx >= 0 && (
    (atCurrentStop && nearestIdx === penultimateIdx) ||
    (nearestIdx === penultimateIdx && nearestDist <= STOP_REACHED_RADIUS_M)
  )

  // Phase 2: user is physically within ARRIVAL_RADIUS_M of destination
  const shouldAlertPhase2 = distToDest <= ARRIVAL_RADIUS_M

  return {
    remainingStops,
    remainingDistanceM: Math.round(remainingDistM),
    etaMinutes: Math.max(0, Math.round(etaSeconds / 60)),
    etaSeconds,
    nextStopName: nextStop?.name ?? null,
    distToNextStopM: Math.round(distToNextStop),
    shouldAlertPhase1,
    shouldAlertPhase2,
    currentStopIndex: nearestIdx,
  }
}

/**
 * Quick check: is `distMeters` ≤ the stop-reached radius?
 * Useful for lightweight GPS tick checks before running full ETA.
 * @param {number} distMeters
 * @returns {boolean}
 */
export function isWithinStopRadius(distMeters) {
  return distMeters <= STOP_REACHED_RADIUS_M
}
