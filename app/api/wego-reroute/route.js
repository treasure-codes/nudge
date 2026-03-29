import { NextResponse } from 'next/server'
import { loadGtfs } from '@/lib/wegoGtfs'

function metersBetween(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLng = (lng2 - lng1) * r
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function closestStops(stops, lat, lng, maxMeters = 500, limit = 5) {
  const results = []
  for (const [id, stop] of Object.entries(stops)) {
    const d = metersBetween(lat, lng, stop.lat, stop.lng)
    if (d <= maxMeters) results.push({ id, ...stop, dist: d })
  }
  return results.sort((a, b) => a.dist - b.dist).slice(0, limit)
}

/**
 * GET /api/wego-reroute?userLat=&userLng=&destLat=&destLng=
 * Returns WeGo bus routes that stop near the user AND later near the destination.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userLat = parseFloat(searchParams.get('userLat'))
  const userLng = parseFloat(searchParams.get('userLng'))
  const destLat = parseFloat(searchParams.get('destLat'))
  const destLng = parseFloat(searchParams.get('destLng'))

  if ([userLat, userLng, destLat, destLng].some(isNaN)) {
    return NextResponse.json({ error: 'userLat/userLng/destLat/destLng required' }, { status: 400 })
  }

  try {
    const { stops, tripRoute, tripStops } = await loadGtfs()

    const boardCandidates = closestStops(stops, userLat, userLng, 500)
    const alightCandidates = closestStops(stops, destLat, destLng, 500)

    if (!boardCandidates.length || !alightCandidates.length) {
      return NextResponse.json({ routes: [] })
    }

    const boardIds = new Set(boardCandidates.map(s => s.id))
    const alightIds = new Set(alightCandidates.map(s => s.id))

    // routeName → { routeName, boardStopName, boardStopId, walkMeters }
    const found = {}

    for (const [tripId, stopList] of Object.entries(tripStops)) {
      const routeName = tripRoute[tripId]
      if (!routeName || found[routeName]) continue

      // Find first board stop in this trip
      let boardIdx = -1
      for (let i = 0; i < stopList.length; i++) {
        if (boardIds.has(stopList[i].stop_id)) { boardIdx = i; break }
      }
      if (boardIdx === -1) continue

      // Find an alight stop AFTER the board stop
      let hasAlight = false
      for (let i = boardIdx + 1; i < stopList.length; i++) {
        if (alightIds.has(stopList[i].stop_id)) { hasAlight = true; break }
      }
      if (!hasAlight) continue

      const boardStopId = stopList[boardIdx].stop_id
      const boardStop = stops[boardStopId]
      found[routeName] = {
        routeName,
        boardStopName: boardStop.name,
        boardStopId,
        walkMeters: Math.round(metersBetween(userLat, userLng, boardStop.lat, boardStop.lng)),
      }
    }

    const routes = Object.values(found)
      .sort((a, b) => a.walkMeters - b.walkMeters)
      .slice(0, 5)

    return NextResponse.json({ routes })
  } catch (err) {
    console.error('[wego-reroute]', err)
    return NextResponse.json({ routes: [] })
  }
}
