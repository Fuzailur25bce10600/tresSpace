
import satelliteData from '../data/satellites'
import debrisData from '../data/debris'

// Convert orbital radius and speed into a common simulation format.
const satellites = [
  {
    ...satelliteData[0],
    radius: 2.75,
    speed: 0.35,
    inclination: 0.5,
  },
  {
    ...satelliteData[1],
    radius: 3.15,
    speed: 0.22,
    inclination: 0.9,
  },
  {
    ...satelliteData[2],
    radius: 3.55,
    speed: 0.14,
    inclination: 0.3,
  },
]

// Calculate an object's position at a given simulation time.
function getPosition(object, time) {
  const angle = object.speed * time

  return {
    x: object.radius * Math.cos(angle),
    y: object.radius * Math.sin(angle) * Math.sin(object.inclination),
    z: object.radius * Math.sin(angle) * Math.cos(object.inclination),
  }
}

// Calculate distance between two 3D positions.
function getDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z

  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// Compare satellites against debris over a future simulation window.
export function detectCollisions(currentTime = 0) {
  const encounters = []

  const timeWindow = 120
  const timeStep = 1
  const closeApproachThreshold = 0.15

  satellites.forEach((satellite) => {
    debrisData.forEach((debris) => {
      let closestDistance = Infinity
      let closestTime = 0

    for (
  let time = currentTime;
  time <= currentTime + timeWindow;
  time += timeStep
) {
        const satellitePosition = getPosition(satellite, time)
        const debrisPosition = getPosition(debris, time)

        const distance = getDistance(
          satellitePosition,
          debrisPosition
        )

        if (distance < closestDistance) {
          closestDistance = distance
          closestTime = time
        }
      }

      if (closestDistance < closeApproachThreshold) {
        encounters.push({
          satellite: satellite.name,
          satelliteId: satellite.id,
          debris: debris.name,
          debrisId: debris.id,
          distance: closestDistance.toFixed(3),
          time: closestTime,
          priority:
            closestDistance < 0.05
              ? 'HIGH'
              : closestDistance < 0.1
              ? 'MEDIUM'
              : 'LOW',
        })
      }
    })
  })

  return encounters.sort(
    (a, b) => Number(a.distance) - Number(b.distance)
  )
}
