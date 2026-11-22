
const API_BASE_URL = 'http://127.0.0.1:8000'

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`)
  }

  return response.json()
}

export function getSatellites() {
  return request('/api/satellites')
}

export function getCollisions() {
  return request(
  '/api/collisions?time_window_hours=1&time_step_seconds=120&threshold_km=100'
)
}

export async function evaluateEncounter(data) {
  const response = await fetch(
    `${API_BASE_URL}/api/avoidance/evaluate-encounter`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  )

  if (!response.ok) {
    throw new Error(`Avoidance evaluation failed: ${response.status}`)
  }

  return response.json()
}

export async function optimizeEncounter(data) {
  const response = await fetch(
    `${API_BASE_URL}/api/avoidance/optimize-encounter`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  )

  if (!response.ok) {
    throw new Error(`Avoidance optimization failed: ${response.status}`)
  }

  return response.json()
}
