
import { useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { TextureLoader, Vector3 } from 'three'
import debrisData from '../data/debris'

const EARTH_RADIUS_KM = 6371
const EARTH_VISUAL_RADIUS = 2.3

function Satellite({
  satellite,
  selected,
  onSelect,
  focusTargetRef,
}) {
  const satelliteRef = useRef()

  const { x, y, z } = satellite.position_km

  const scale = EARTH_VISUAL_RADIUS / EARTH_RADIUS_KM

  const position = [
    x * scale,
    z * scale,
    -y * scale,
  ]

  useFrame(() => {
    if (satelliteRef.current && selected) {
      satelliteRef.current.getWorldPosition(focusTargetRef.current)
    }
  })

  return (
    <group
      ref={satelliteRef}
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color={selected ? '#ffffff' : satellite.color}
          emissive={satellite.color}
          emissiveIntensity={selected ? 2 : 0.7}
        />
      </mesh>

      <pointLight
        color={satellite.color}
        intensity={0.3}
        distance={0.35}
      />
    </group>
  )
}

function Debris({ radius, speed, color, inclination, isPaused }) {
  const debrisRef = useRef()
  const angle = useRef(0)

  useFrame((_, delta) => {
    if (!isPaused && debrisRef.current) {
      angle.current += delta * speed

      const x = radius * Math.cos(angle.current)
      const y = radius * Math.sin(angle.current) * Math.sin(inclination)
      const z = radius * Math.sin(angle.current) * Math.cos(inclination)

      debrisRef.current.position.set(x, y, z)
    }
  })

  return (
    <mesh ref={debrisRef}>
      <icosahedronGeometry args={[0.055, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

function CameraController({ controlsRef, focusTargetRef, selectedSatellite }) {
  const { camera } = useThree()
  const wasSelected = useRef(false)
  const isReturning = useRef(false)

  useFrame(() => {
    if (!controlsRef.current) return

    const controls = controlsRef.current
    controls.target.set(0, 0, 0)

    if (selectedSatellite) {
      wasSelected.current = true
      isReturning.current = false

      const direction = focusTargetRef.current.clone().normalize()
      const desiredPosition = direction.multiplyScalar(6)

      camera.position.lerp(desiredPosition, 0.04)
    } else {
      if (wasSelected.current) {
        wasSelected.current = false
        isReturning.current = true
      }

      if (isReturning.current) {
        const direction = camera.position.clone().normalize()
        const defaultPosition = direction.multiplyScalar(8.5)

        camera.position.lerp(defaultPosition, 0.05)

        if (camera.position.distanceTo(defaultPosition) < 0.02) {
          camera.position.copy(defaultPosition)
          isReturning.current = false
        }
      }
    }

    controls.update()
  })

  return null
}

function Globe({
  satellites,
  selectedSatellite,
  setSelectedSatellite,
  isPaused,
  onPauseChange,
  controlsRef,
}) {
  const earthRef = useRef()
  const focusTargetRef = useRef(new Vector3())

  const earthTexture = useLoader(
    TextureLoader,
    '/src/assets/earth.jpg'
  )

  useFrame((_, delta) => {
    if (!isPaused && earthRef.current) {
      earthRef.current.rotation.y += delta * 0.12
    }
  })

  return (
    <group
      onClick={() => {
        if (selectedSatellite) {
          setSelectedSatellite(null)
          onPauseChange(false)
        }
      }}
    >
      <CameraController
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
        selectedSatellite={selectedSatellite}
      />

      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_VISUAL_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <mesh scale={1.045}>
        <sphereGeometry args={[EARTH_VISUAL_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#9b8cff"
          transparent
          opacity={0.10}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[2.75, 0.009, 8, 160]} />
        <meshBasicMaterial color="#b69aff" />
      </mesh>

      <mesh rotation={[Math.PI / 2.3, 0.4, 0]}>
        <torusGeometry args={[3.15, 0.008, 8, 160]} />
        <meshBasicMaterial color="#73cfff" />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0.8, 0]}>
        <torusGeometry args={[3.55, 0.008, 8, 160]} />
        <meshBasicMaterial color="#e8bd83" />
      </mesh>

      {satellites
  .filter((satellite) => satellite.position_km)
  .map((satellite) => (
        <Satellite
          key={satellite.id}
          satellite={satellite}
          selected={selectedSatellite === satellite.id}
          focusTargetRef={focusTargetRef}
          onSelect={() => {
            setSelectedSatellite(satellite.id)
            onPauseChange(true)
          }}
        />
      ))}

      {debrisData.map((debris) => (
        <Debris
          key={debris.id}
          radius={debris.radius}
          speed={debris.speed}
          color={debris.color}
          inclination={debris.inclination}
          isPaused={isPaused}
        />
      ))}
    </group>
  )
}

export default function Earth({
  satellites = [],
  selectedSatellite,
  onSatelliteSelect,
  isPaused,
  onPauseChange,
}) {
  const controlsRef = useRef()

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 35 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => {
        if (isPaused) {
          onSatelliteSelect(null)
          onPauseChange(false)
        }
      }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 3, 5]} intensity={2.5} />

      <Stars
        radius={80}
        depth={50}
        count={1800}
        factor={3}
        saturation={0}
        fade
      />

      <Globe
        satellites={satellites}
        selectedSatellite={selectedSatellite}
        setSelectedSatellite={onSatelliteSelect}
        isPaused={isPaused}
        onPauseChange={onPauseChange}
        controlsRef={controlsRef}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={5}
        maxDistance={12}
      />
    </Canvas>
  )
}
