export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth radius in metres
  const toRad = Math.PI / 180
  
  const phi1 = lat1 * toRad
  const phi2 = lat2 * toRad
  const deltaPhi = (lat2 - lat1) * toRad
  const deltaLambda = (lon2 - lon1) * toRad

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Returns distance in metres
}
