import JSZip from 'jszip'

const GTFS_URL = 'https://www.wegotransit.com/GoogleExport/Google_Transit.zip'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Module-level cache — persists across requests within the same server instance
let gtfsCache = null
let cacheLoadedAt = 0

// ── CSV helpers ──────────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, '')).map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim() })
    return obj
  })
}

// Fast parser for stop_times — no quoted fields, index-based for speed
function parseStopTimes(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const raw = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim())
  const ti = raw.indexOf('trip_id')
  const si = raw.indexOf('stop_id')
  const qi = raw.indexOf('stop_sequence')

  const result = {}
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const vals = line.split(',')
    const tid = vals[ti]?.trim()
    const sid = vals[si]?.trim()
    const seq = parseInt(vals[qi], 10)
    if (!tid || !sid || isNaN(seq)) continue
    if (!result[tid]) result[tid] = []
    result[tid].push({ stop_id: sid, seq })
  }

  for (const tid of Object.keys(result)) {
    result[tid].sort((a, b) => a.seq - b.seq)
  }
  return result
}

// ── Haversine ────────────────────────────────────────────────────────────────

function metersBetween(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLng = (lng2 - lng1) * r
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── GTFS loader ──────────────────────────────────────────────────────────────

/**
 * Download and parse the WeGo GTFS zip. Caches result for 24h.
 * @returns {{ stops, tripRoute, tripStops }}
 */
export async function loadGtfs() {
  const now = Date.now()
  if (gtfsCache && now - cacheLoadedAt < CACHE_TTL_MS) return gtfsCache

  console.log('[WeGoGTFS] Downloading GTFS feed…')
  const res = await fetch(GTFS_URL)
  if (!res.ok) throw new Error(`GTFS download failed: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  const [stopsText, routesText, tripsText, stopTimesText] = await Promise.all([
    zip.file('stops.txt')?.async('string'),
    zip.file('routes.txt')?.async('string'),
    zip.file('trips.txt')?.async('string'),
    zip.file('stop_times.txt')?.async('string'),
  ])

  // stops: stop_id → { name, lat, lng }
  const stops = {}
  for (const row of parseCsv(stopsText ?? '')) {
    const lat = parseFloat(row.stop_lat)
    const lng = parseFloat(row.stop_lon)
    if (isNaN(lat) || isNaN(lng)) continue
    stops[row.stop_id] = { name: row.stop_name, lat, lng }
  }

  // routes: route_id → route_short_name
  const routeById = {}
  for (const row of parseCsv(routesText ?? '')) {
    routeById[row.route_id] = row.route_short_name ?? ''
  }

  // tripRoute: trip_id → route_short_name
  const tripRoute = {}
  for (const row of parseCsv(tripsText ?? '')) {
    tripRoute[row.trip_id] = routeById[row.route_id] ?? ''
  }

  // tripStops: trip_id → [{ stop_id, seq }] sorted by sequence
  const tripStops = parseStopTimes(stopTimesText ?? '')

  gtfsCache = { stops, tripRoute, tripStops }
  cacheLoadedAt = now
  console.log(`[WeGoGTFS] Loaded: ${Object.keys(stops).length} stops, ${Object.keys(tripStops).length} trips`)
  return gtfsCache
}

// ── Stop matching ────────────────────────────────────────────────────────────

function findClosestStop(stops, lat, lng, maxMeters = 600) {
  let bestId = null
  let bestDist = Infinity
  for (const [id, stop] of Object.entries(stops)) {
    const d = metersBetween(lat, lng, stop.lat, stop.lng)
    if (d < bestDist) { bestDist = d; bestId = id }
  }
  return bestDist <= maxMeters ? bestId : null
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Return the ordered list of WeGo stops between two coordinates.
 * Optionally filtered to a specific route (e.g. "56").
 *
 * @param {number} boardLat
 * @param {number} boardLng
 * @param {number} alightLat
 * @param {number} alightLng
 * @param {string} [routeShortName]
 * @returns {Promise<Array<{id, name, lat, lng, type}>>}
 */
export async function getStopsBetween(boardLat, boardLng, alightLat, alightLng, routeShortName) {
  const { stops, tripRoute, tripStops } = await loadGtfs()

  const boardId = findClosestStop(stops, boardLat, boardLng)
  const alightId = findClosestStop(stops, alightLat, alightLng)

  if (!boardId || !alightId || boardId === alightId) return []

  // Walk trips to find one that contains both stops in the right order
  for (const [tripId, stopList] of Object.entries(tripStops)) {
    // Filter by route if caller provided one
    if (routeShortName && tripRoute[tripId] !== routeShortName) continue

    const boardIdx = stopList.findIndex(s => s.stop_id === boardId)
    if (boardIdx === -1) continue
    const alightIdx = stopList.findIndex(s => s.stop_id === alightId)
    if (alightIdx === -1 || alightIdx <= boardIdx) continue

    // Found a matching trip — return the slice of stops
    const slice = stopList.slice(boardIdx, alightIdx + 1)
    return slice.map((s, i) => {
      const stop = stops[s.stop_id]
      const isFirst = i === 0
      const isLast = i === slice.length - 1
      return {
        id: s.stop_id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        type: isFirst ? 'boarding' : isLast ? 'alighting' : 'intermediate',
      }
    })
  }

  return []
}
