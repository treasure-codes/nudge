import { NextResponse } from 'next/server'
import { getStopsBetween } from '@/lib/wegoGtfs'

export async function POST(req) {
  const { originLat, originLng, destLat, destLng } = await req.json()

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps',
        },
        body: JSON.stringify({
          origin: {
            location: { latLng: { latitude: originLat, longitude: originLng } },
          },
          destination: {
            location: { latLng: { latitude: destLat, longitude: destLng } },
          },
          travelMode: 'TRANSIT',
        }),
      }
    )

    const data = await response.json()

    if (!data.routes?.length) {
      // Transit not available — fall back to DRIVE for ETA only
      const fallback = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps',
          },
          body: JSON.stringify({
            origin: {
              location: { latLng: { latitude: originLat, longitude: originLng } },
            },
            destination: {
              location: { latLng: { latitude: destLat, longitude: destLng } },
            },
            travelMode: 'DRIVE',
          }),
        }
      )
      const fallbackData = await fallback.json()
      if (!fallbackData.routes?.length) {
        return NextResponse.json({ error: 'No route found' }, { status: 404 })
      }
      const route = fallbackData.routes[0]
      const durationSec = Number(route.duration.replace('s', ''))
      return NextResponse.json({
        durationSeconds: durationSec,
        durationMinutes: Math.max(1, Math.round(durationSec / 60)),
        distanceMeters: route.distanceMeters,
        routeSteps: [],
      })
    }

    const route = data.routes[0]

    // ── Extract timing up to last transit stop ───────────────────────────
    let lastTransitIndex = -1
    if (route.legs?.[0]?.steps) {
      route.legs[0].steps.forEach((step, idx) => {
        if (step.transitDetails) lastTransitIndex = idx
      })
    }

    let transitTotalSec = 0
    let transitTotalMeters = 0
    if (lastTransitIndex !== -1 && route.legs?.[0]?.steps) {
      route.legs[0].steps.forEach((step, idx) => {
        if (idx <= lastTransitIndex) {
          transitTotalSec += Number(step.duration?.replace('s', '') || step.staticDuration?.replace('s', '') || 0)
          transitTotalMeters += (step.distanceMeters || 0)
        }
      })
    }

    const globalDurationSec = Number(route.duration?.replace('s', '') || 0)
    const finalSec = lastTransitIndex !== -1 ? transitTotalSec : globalDurationSec
    const finalMeters = lastTransitIndex !== -1 ? transitTotalMeters : route.distanceMeters

    // ── Build stop list from WeGo GTFS ───────────────────────────────────
    let routeSteps = []

    if (route.legs?.[0]?.steps) {
      for (const step of route.legs[0].steps) {
        if (!step.transitDetails) continue

        const detail = step.transitDetails
        const boardLoc = detail.stopDetails?.departureStop?.location?.latLng
        const alightLoc = detail.stopDetails?.arrivalStop?.location?.latLng
        const routeShortName = detail.transitLine?.nameShort ?? null

        if (!boardLoc || !alightLoc) continue

        try {
          // Try to get the full stop sequence from WeGo GTFS
          const wegoStops = await getStopsBetween(
            boardLoc.latitude, boardLoc.longitude,
            alightLoc.latitude, alightLoc.longitude,
            routeShortName
          )

          if (wegoStops.length > 0) {
            // WeGo returned full stop sequence — use it
            routeSteps = [...routeSteps, ...wegoStops]
          } else {
            // GTFS match failed — fall back to just boarding + alighting from Google
            const boardName = detail.stopDetails?.departureStop?.name
            const alightName = detail.stopDetails?.arrivalStop?.name

            if (boardName && boardLoc) {
              routeSteps.push({
                id: `b-${routeSteps.length}`,
                name: `Board at ${boardName}`,
                type: 'boarding',
                lat: boardLoc.latitude,
                lng: boardLoc.longitude,
              })
            }
            if (alightName && alightLoc) {
              routeSteps.push({
                id: `a-${routeSteps.length}`,
                name: `Get off at ${alightName}`,
                type: 'alighting',
                lat: alightLoc.latitude,
                lng: alightLoc.longitude,
              })
            }
          }
        } catch (gtfsErr) {
          console.warn('[WeGoGTFS] Error fetching stops:', gtfsErr.message)
          // Fall back to boarding/alighting from Google
          const boardName = detail.stopDetails?.departureStop?.name
          const alightName = detail.stopDetails?.arrivalStop?.name
          if (boardName) routeSteps.push({ id: `b-${routeSteps.length}`, name: `Board at ${boardName}`, type: 'boarding', lat: boardLoc.latitude, lng: boardLoc.longitude })
          if (alightName) routeSteps.push({ id: `a-${routeSteps.length}`, name: `Get off at ${alightName}`, type: 'alighting', lat: alightLoc.latitude, lng: alightLoc.longitude })
        }
      }
    }

    return NextResponse.json({
      durationSeconds: finalSec,
      durationMinutes: Math.max(1, Math.round(finalSec / 60)),
      distanceMeters: finalMeters,
      routeSteps,
    })

  } catch (err) {
    console.error('ETA error:', err)
    return NextResponse.json({ error: 'Failed to compute ETA' }, { status: 500 })
  }
}
