import { useEffect } from 'react'

export function useJourneyStateStorage({
  state,
  destination,
  pendingLegs,
  currentLegIndex,
  totalLegs,
  routeSteps,
  routeNumber,
  watchToken,
  setState,
  setDestination,
  setPendingLegs,
  setCurrentLegIndex,
  setTotalLegs,
  setRouteSteps,
  setRouteNumber,
  setWatchToken,
  setContacts,
  setUserName,
  JOURNEY_STATE
}) {
  // Load contacts + username + active trip exactly once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('nudge_contacts')
      if (saved) setContacts(JSON.parse(saved))
      
      const savedName = localStorage.getItem('nudge_username')
      if (savedName) setUserName(savedName)

      const savedActiveTrip = sessionStorage.getItem('nudge_active_trip')
      if (savedActiveTrip) {
        const trip = JSON.parse(savedActiveTrip)
        if (trip.state && trip.state !== JOURNEY_STATE.IDLE) {
          setState(trip.state)
          setDestination(trip.destination)
          setPendingLegs(trip.pendingLegs || [])
          setCurrentLegIndex(trip.currentLegIndex || 0)
          setTotalLegs(trip.totalLegs || 1)
          setRouteSteps(trip.routeSteps || [])
          setRouteNumber(trip.routeNumber || '')
          setWatchToken(trip.watchToken || null)
        }
      }
    } catch (e) {
      console.warn('Storage read error:', e)
    }
  }, [
    setState, setDestination, setPendingLegs, setCurrentLegIndex, 
    setTotalLegs, setRouteSteps, setWatchToken, setContacts, setUserName, JOURNEY_STATE.IDLE
  ])

  // Auto-save trip state to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (state !== JOURNEY_STATE.IDLE) {
      sessionStorage.setItem('nudge_active_trip', JSON.stringify({
        state,
        destination,
        pendingLegs,
        currentLegIndex,
        totalLegs,
        routeSteps,
        routeNumber,
        watchToken
      }))
    } else {
      sessionStorage.removeItem('nudge_active_trip')
    }
  }, [
    state, destination, pendingLegs, currentLegIndex, 
    totalLegs, routeSteps, routeNumber, watchToken, JOURNEY_STATE.IDLE
  ])
}
