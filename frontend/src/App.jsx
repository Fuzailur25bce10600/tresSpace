
import './App.css'
import Earth from './components/Earth'
import satelliteData from './data/satellites'
import { useState } from 'react'
import debrisData from './data/debris'
import { detectCollisions } from './utils/collisionEngine'
import { generateManoeuvre } from './utils/manoeuvreEngine'

function App() {
const [selectedSatellite, setSelectedSatellite] = useState(null)
const [isPaused, setIsPaused] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
const [orbitFilter, setOrbitFilter] = useState('ALL')
const [objectType, setObjectType] = useState('SATELLITES')
const [simulationTime, setSimulationTime] = useState(0)
const [selectedAlert, setSelectedAlert] = useState(null)
const [manoeuvre, setManoeuvre] = useState(null)
const [fuelReserve, setFuelReserve] = useState(100)
const [disposalStrategy, setDisposalStrategy] = useState('deorbit')
const [disposalPlan, setDisposalPlan] = useState(null)
const [disposalStatus, setDisposalStatus] = useState('ACTIVE')
const [activeBottomTab, setActiveBottomTab] = useState('TRACKING')
const [trackingActivity, setTrackingActivity] = useState([
  {
    id: 1,
    action: 'SYSTEM INITIALIZED',
    target: 'Orbital monitoring active',
    time: 'T+0',
  },
])
const selectedSatelliteData = satelliteData.find(
  (satellite) => satellite.id === selectedSatellite
)
const collisionAlerts = detectCollisions(simulationTime)
const orbitalDistribution = ['LEO', 'MEO', 'GEO'].map((orbit) => ({
  name: orbit,
  count: satelliteData.filter(
    (satellite) => satellite.type === orbit
  ).length,
}))
const currentObjects =
  objectType === 'SATELLITES' ? satelliteData : debrisData

const filteredSatellites = currentObjects.filter((satellite) => {
  const matchesSearch =
    satellite.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    satellite.id.toLowerCase().includes(searchTerm.toLowerCase())

  const matchesOrbit =
    orbitFilter === 'ALL' || satellite.type === orbitFilter

  return matchesSearch && matchesOrbit
})
  return (
    <div className="app">
  

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">MISSION CONTROL / OVERVIEW</div>
          <div className="topbar-right">
            <span className="live-indicator"><i /> LIVE DATA</span>
            <div className="avatar">TS</div>
          </div>
        </header>

        <section className="control-room" id="overview">

          {/* LEFT PANEL */}
          <section className="panel left-panel">
         <div className="panel-heading">
  <span>OBJECT CATALOGUE</span>
  <span className="panel-tag">{filteredSatellites.length}</span>



</div>

<input
  className="catalogue-search"
  type="text"
  placeholder="Search name or NORAD ID..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>


<div className="catalogue-filters">
  <button
    className={objectType === 'SATELLITES' ? 'filter-btn active' : 'filter-btn'}
    onClick={() => {
      setObjectType('SATELLITES')
      setOrbitFilter('ALL')
    }}
  >
    SATELLITES
  </button>

  <button
    className={objectType === 'DEBRIS' ? 'filter-btn active' : 'filter-btn'}
    onClick={() => {
      setObjectType('DEBRIS')
      setOrbitFilter('ALL')
    }}
  >
    DEBRIS ({debrisData.length})
  </button>
</div>

<div className="catalogue-filters">
  {['ALL', 'LEO', 'MEO', 'GEO'].map((filter) => (
    <button
      key={filter}
      className={orbitFilter === filter ? 'filter-btn active' : 'filter-btn'}
      onClick={() => setOrbitFilter(filter)}
    >
      {filter}
    </button>
  ))}
</div>

<div className="catalogue-list">
  {filteredSatellites.map((satellite) => (
    <button
      key={satellite.id}
      className={
        selectedSatellite === satellite.id
          ? 'catalogue-item selected'
          : 'catalogue-item'
      }
onClick={() => {
  if (objectType === 'SATELLITES') {
    setSelectedSatellite(satellite.id)
    setIsPaused(true)
    setDisposalPlan(null)
    setDisposalStatus('ACTIVE')
  }
}}
    >
      <span
        className="catalogue-dot"
        style={{ background: satellite.color }}
      />

      <span className="catalogue-item-info">
        <strong>{satellite.name}</strong>
        <small>{satellite.id} · {satellite.type}</small>
      </span>

      <span className="catalogue-arrow">›</span>
    </button>
  ))}

  {filteredSatellites.length === 0 && (
    <p className="catalogue-empty">No matching objects found.</p>
  )}

  
</div>
<div className="disposal-panel">
  <div className="panel-heading">
    <h3>END-OF-LIFE DISPOSAL</h3>
    <span className="live-indicator">MODULE</span>
  </div>

  <p className="muted">
    Select a satellite to configure its disposal strategy.
  </p>

  {selectedSatelliteData ? (
    <>
      <div className="disposal-target">
        <small>SELECTED TARGET</small>
        <strong>{selectedSatelliteData.name}</strong>
      </div>

     <select
  className="disposal-select"
  value={disposalStrategy}
  onChange={(e) => {
    setDisposalStrategy(e.target.value)
    setDisposalPlan(null)
      setDisposalStatus('ACTIVE')
  }}
>
  <option value="deorbit">Controlled Deorbit</option>
  <option value="decay">Natural Orbital Decay</option>
  <option value="graveyard">Graveyard Orbit</option>
</select>

    <button
  className="disposal-button"
  onClick={() => {
    const plans = {
      deorbit: {
        name: 'Controlled Deorbit',
        fuel: 12,
        duration: '3–6 months',
        description: 'Lower orbital altitude for atmospheric re-entry.',
      },
      decay: {
        name: 'Natural Orbital Decay',
        fuel: 0,
        duration: 'Variable',
        description: 'Allow atmospheric drag to gradually reduce altitude.',
      },
      graveyard: {
        name: 'Graveyard Orbit',
        fuel: 8,
        duration: '1–2 manoeuvres',
        description: 'Transfer the satellite to a designated disposal orbit.',
      },
    }

    setDisposalPlan(plans[disposalStrategy])
  }}
>
  CONFIGURE DISPOSAL
</button> 
{disposalPlan && (
  <div className="disposal-result">
    <span>DISPOSAL PLAN</span>
    <strong>{disposalPlan.name}</strong>

    <div>
      <small>Estimated fuel requirement</small>
      <strong>{disposalPlan.fuel}%</strong>
    </div>

    <div>
      <small>Estimated timeline</small>
      <strong>{disposalPlan.duration}</strong>
    </div>

    <p>{disposalPlan.description}</p>

<button
  className="disposal-button"
  disabled={disposalStatus === 'DISPOSAL INITIATED'}
  onClick={() => {
    const fuelCost = Number(disposalPlan.fuel)

    if (fuelReserve < fuelCost) {
      alert('Insufficient fuel reserve!')
      return
    }

    setFuelReserve((fuel) => fuel - fuelCost)
    setDisposalStatus('DISPOSAL INITIATED')
setTrackingActivity((activities) => [
  {
    id: Date.now(),
    action: 'END-OF-LIFE DISPOSAL',
    target: selectedSatelliteData.name,
    time: `T+${simulationTime}`,
  },
  ...activities,
].slice(0, 4))
    console.log('Disposal executed:', {
      strategy: disposalPlan.name,
      fuelConsumed: fuelCost,
      remainingFuel: fuelReserve - fuelCost
    })
  }}
>
  CONFIRM DISPOSAL
</button>

<small className="disposal-status">
  STATUS: {disposalStatus}
</small>
<small className="disposal-status">
  FUEL AFTER DISPOSAL: {fuelReserve.toFixed(2)}%
</small>

  </div>
)}
    </>
  ) : (
    <small className="muted">No satellite selected</small>
  )}
</div>
          </section>



          {/* CENTRAL EARTH */}
          <section className="earth-section" id="orbit">
            <div className="earth-heading">
              <div>
                <p className="eyebrow">LIVE VISUALIZATION</p>
                <h1>Orbital Environment<span>.</span></h1>
              </div>
              <span className="live-indicator"><i /> SIMULATION READY</span>
            </div>
              <div className="earth-stage">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="earth-container">
           <Earth
  selectedSatellite={selectedSatellite}
  onSatelliteSelect={setSelectedSatellite}
  isPaused={isPaused}
  onPauseChange={setIsPaused}
/>
              </div>
              <div className="earth-coordinates">
                3D ORBITAL VIEW<br />
                <small>Earth-centred reference frame</small>
              </div>
            </div>
<div className="simulation-controls">
  <div className="simulation-clock">
    <span>SIMULATION TIME</span>
    <strong>T+{simulationTime}</strong>
  </div>

  <button
    onClick={() => setSimulationTime((time) => Math.max(0, time - 10))}
  >
    −10
  </button>

  <button onClick={() => setSimulationTime((time) => time + 10)}>
    +10
  </button>

  <button onClick={() => setSimulationTime(0)}>
    RESET
  </button>
</div>
            <div className="earth-footer">
              <span>OBJECTS: 12,847</span>
              <span>ENGINE: SGP4</span>
              <span>MODE: REAL-TIME</span>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <section className="panel right-panel" id="collisions">
            {/* SELECTED SATELLITE */}
<div className="satellite-info">
  <div className="panel-heading">
    <span>SATELLITE DETAILS</span>
    <span className="panel-tag">01</span>
  </div>

  {selectedSatelliteData ? (
    <>
      <h2>{selectedSatelliteData.name}</h2>
      <small>NORAD ID: {selectedSatelliteData.id}</small>

      <div className="satellite-stats">
        <div>
          <span>ORBIT TYPE</span>
          <strong>{selectedSatelliteData.type}</strong>
        </div>

        <div>
          <span>ALTITUDE</span>
          <strong>{selectedSatelliteData.altitude}</strong>
        </div>

        <div>
          <span>VELOCITY</span>
          <strong>{selectedSatelliteData.velocity}</strong>
        </div>

        <div>
          <span>STATUS</span>
          <strong>{selectedSatelliteData.status}</strong>
        </div>
      </div>
    </>
  ) : (
    <div className="empty-satellite">
      <span>Select a satellite from the orbital view</span>
      <small>Click a spacecraft to inspect its details</small>
    </div>
  )}
</div>

<div className="panel-divider" />
            <div className="panel-heading">
              <span>COLLISION MONITOR</span>
              <span className="alert-count">
  {collisionAlerts.length} ALERTS
</span>
            </div>

            {collisionAlerts.length > 0 ? (
  collisionAlerts.slice(0, 3).map((alert, index) => (
    <div
  className={`risk-card ${alert.priority.toLowerCase()} ${
    selectedAlert === alert ? 'selected' : ''
  }`}
  onClick={() => setSelectedAlert(alert)}
      key={`${alert.satelliteId}-${alert.debrisId}`}
    >
      <span>{alert.priority} PRIORITY</span>
      <strong>{alert.satellite} / {alert.debris}</strong>
      <small>
        Separation: {alert.distance} units · T+{alert.time}
      </small>
    </div>
  ))
) : (
  <div className="risk-card low">
    <span>NO CLOSE APPROACHES</span>
    <strong>Orbital environment clear</strong>
    <small>No encounters below the configured threshold</small>
  </div>
)}

            <div className="panel-divider" />

            <div className="panel-heading">
              <span>RISK ASSESSMENT</span>
            </div>
            <div className="risk-summary">
  <strong>{collisionAlerts.length}</strong>
  <span>Detected close approaches</span>
</div>
            <small className="muted">Waiting for orbital calculations</small>
            <div className="fuel-panel">
  <div className="fuel-heading">
    <span>FUEL RESERVE</span>
    <strong>{fuelReserve.toFixed(2)}%</strong>
  </div>

  <div className="fuel-track">
    <div
      className="fuel-fill"
      style={{ width: `${fuelReserve}%` }}
    />
  </div>

  <small>Remaining manoeuvring capacity</small>
</div>

{selectedAlert && (
  <button
    className="manoeuvre-button"
    onClick={() =>
      setManoeuvre(generateManoeuvre(selectedAlert))
    }
  >
    GENERATE AVOIDANCE MANOEUVRE
  </button>
)}

{manoeuvre && (
  <div className="manoeuvre-result">
    <span>PROPOSED MANOEUVRE</span>

    <strong>{manoeuvre.satellite}</strong>

    <div>
      <small>Target debris</small>
      <strong>{manoeuvre.debris}</strong>
    </div>

    <div>
      <small>Predicted separation</small>
      <strong>{manoeuvre.predictedDistance} units</strong>
    </div>

    <div>
      <small>Fuel consumption</small>
      <strong>{manoeuvre.fuelCost} units</strong>
    </div>

    <div>
      <small>Burn duration</small>
      <strong>{manoeuvre.burnDuration} sec</strong>
    </div>

    <span className="manoeuvre-status">
      {manoeuvre.status}
    </span>
    <div className="manoeuvre-actions">
 <button
  className="execute-button"
  onClick={() => {
    if (manoeuvre && fuelReserve >= manoeuvre.fuelCost) {
      setFuelReserve((fuel) =>
        Math.max(0, fuel - manoeuvre.fuelCost)
      )

      setManoeuvre((current) => ({
        ...current,
        status: 'EXECUTED',
      }))
      setTrackingActivity((activities) => [
  {
    id: Date.now(),
    action: 'AVOIDANCE MANOEUVRE',
    target: manoeuvre.satellite,
    time: `T+${simulationTime}`,
  },
  ...activities,
].slice(0, 4))
    }
  }}
  disabled={
    manoeuvre.status === 'EXECUTED' ||
    fuelReserve < manoeuvre.fuelCost
  }
>
  EXECUTE
</button>

  <button
    className="cancel-button"
    onClick={() => {
      setManoeuvre(null)
      setSelectedAlert(null)
    }}
  >
    CANCEL
  </button>
</div>
  </div>
)}

          </section>

      {/* BOTTOM TABBED PANEL */}
<section className="bottom-panel bottom-tabs-panel">

  <div className="bottom-tab-header">
    <button
      className={activeBottomTab === 'TRACKING' ? 'bottom-tab active' : 'bottom-tab'}
      onClick={() => setActiveBottomTab('TRACKING')}
    >
      TRACKING ACTIVITY
    </button>

    <button
      className={activeBottomTab === 'ANALYTICS' ? 'bottom-tab active' : 'bottom-tab'}
      onClick={() => setActiveBottomTab('ANALYTICS')}
    >
      ORBITAL ANALYTICS
    </button>

    <button
      className={activeBottomTab === 'SYSTEM' ? 'bottom-tab active' : 'bottom-tab'}
      onClick={() => setActiveBottomTab('SYSTEM')}
    >
      SYSTEM STATUS
    </button>
  </div>

  {activeBottomTab === 'TRACKING' && (
    <div className="activity-list">
      {trackingActivity.map((activity) => (
        <div className="activity-item" key={activity.id}>
          <div className="activity-indicator" />
          <div>
            <strong>{activity.action}</strong>
            <span>{activity.target}</span>
          </div>
          <small>{activity.time}</small>
        </div>
      ))}
    </div>
  )}

  {activeBottomTab === 'ANALYTICS' && (
    <>
      <div className="analytics-grid">
        <div>
          <strong>{satelliteData.length}</strong>
          <span>SATELLITES</span>
        </div>
        <div>
          <strong>{debrisData.length}</strong>
          <span>DEBRIS</span>
        </div>
        <div>
          <strong>{collisionAlerts.length}</strong>
          <span>COLLISION ALERTS</span>
        </div>
      </div>

      <div className="orbit-distribution">
        <span className="distribution-heading">ORBITAL DISTRIBUTION</span>

        {orbitalDistribution.map((orbit) => {
          const percentage = satelliteData.length > 0
            ? (orbit.count / satelliteData.length) * 100
            : 0

          return (
            <div className="distribution-row" key={orbit.name}>
              <span>{orbit.name}</span>
              <div className="distribution-track">
                <div
                  className="distribution-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <small>{orbit.count}</small>
            </div>
          )
        })}
      </div>
    </>
  )}

  {activeBottomTab === 'SYSTEM' && (
    <div className="system-status-list">
      <div className="system-status">
        <i className="status-online" />
        Orbital Visualization — ONLINE
      </div>
      <div className="system-status">
        <i className="status-online" />
        Collision Detection — ONLINE
      </div>
      <div className="system-status">
        <i className="status-online" />
        Fuel Management — ONLINE
      </div>
      <div className="system-status">
        <i className="status-simulated" />
        Disposal Module — SIMULATED
      </div>
      <div className="system-status">
        <i className="status-pending" />
        Backend API — INTEGRATING
      </div>
    </div>
  )}

</section>

          <section className="bottom-panel" id="analytics">
            <div className="panel-heading">
              <span>ORBITAL ANALYTICS</span>
              <span className="panel-tag">03</span>
            </div>
        <div className="analytics-grid">
  <div>
    <strong>{satelliteData.length}</strong>
    <span>SATELLITES</span>
  </div>

  <div>
    <strong>{debrisData.length}</strong>
    <span>DEBRIS</span>
  </div>

  <div>
    <strong>{collisionAlerts.length}</strong>
    <span>COLLISION ALERTS</span>
  </div>
</div>
<div className="orbit-distribution">
  <span className="distribution-heading">ORBITAL DISTRIBUTION</span>

  {orbitalDistribution.map((orbit) => {
    const percentage =
      satelliteData.length > 0
        ? (orbit.count / satelliteData.length) * 100
        : 0

    return (
      <div className="distribution-row" key={orbit.name}>
        <span>{orbit.name}</span>

        <div className="distribution-track">
          <div
            className="distribution-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <small>{orbit.count}</small>
      </div>
    )
  })}
</div>
          </section>

          <section className="bottom-panel system-panel">
            <div className="panel-heading">
              <span>SYSTEM STATUS</span>
              <span className="panel-tag">04</span>
            </div>
          <div className="system-status">
  <i className="status-online" />
  Orbital Visualization — ONLINE
</div>

<div className="system-status">
  <i className="status-online" />
  Collision Detection — ONLINE
</div>

<div className="system-status">
  <i className="status-online" />
  Fuel Management — ONLINE
</div>

<div className="system-status">
  <i className="status-simulated" />
  Disposal Module — SIMULATED
</div>

<div className="system-status">
  <i className="status-pending" />
  Backend API — INTEGRATING
</div>
          </section>

        </section>
      </main>
    </div>
  )
}

export default App
