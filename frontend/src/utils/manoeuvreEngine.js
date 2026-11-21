export function generateManoeuvre(alert) {
  if (!alert) return null

  const fuelCost = Number(
    (0.5 + Math.random() * 1.5).toFixed(2)
  )

  return {
    satellite: alert.satellite,
    debris: alert.debris,
    originalDistance: alert.distance,
    predictedDistance: (
      Number(alert.distance) + 0.25 + fuelCost * 0.15
    ).toFixed(3),
    burnDuration: Math.round(5 + fuelCost * 8),
    fuelCost,
    status: 'PROPOSED',
  }
}