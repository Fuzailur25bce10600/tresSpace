
import { useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { TextureLoader, Vector3 } from 'three'
import debrisData from '../data/debris'


function Satellite({
  radius,
  speed,
  color,
  inclination,
  selected,
  onSelect,
  isPaused,
  focusTargetRef,
isSelected,
}) {
  const satelliteRef = useRef()
const worldPosition = useRef(new Vector3())
 const angle = useRef(0)

useFrame((_, delta) => {
  if (!isPaused) {
    angle.current += delta * speed

    if (satelliteRef.current) {
      const x = radius * Math.cos(angle.current)
      const y = radius * Math.sin(angle.current) * Math.sin(inclination)
      const z = radius * Math.sin(angle.current) * Math.cos(inclination)

      satelliteRef.current.position.set(x, y, z)
      satelliteRef.current.rotation.y = -angle.current
    }
  }

  if (satelliteRef.current && isSelected) {
    satelliteRef.current.getWorldPosition(focusTargetRef.current)
  }
})

  return (
    <group
  ref={satelliteRef}
  onClick={(event) => {
    event.stopPropagation()
    onSelect()
  }}
>
      {/* Main satellite body */}
      <mesh>
        <boxGeometry args={[0.18, 0.18, 0.22]} />
        <meshStandardMaterial
           color={selected ? '#ffffff' : '#d8d2e8'}
  emissive={color}
  emissiveIntensity={selected ? 2 : 0.4}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Left solar panel */}
      <mesh position={[-0.22, 0, 0]}>
      <boxGeometry args={[0.38, 0.035, 0.18]} />
        <meshStandardMaterial
          color="#5576b9"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Right solar panel */}
      <mesh position={[0.22, 0, 0]}>
        <boxGeometry args={[0.38, 0.035, 0.18]} />
        <meshStandardMaterial
          color="#5576b9"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Identification light */}
      <mesh position={[0, 0, 0.12]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Soft glow */}
      <pointLight color={color} intensity={0.7} distance={0.6} />
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
        roughness={0.8}
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

    // Earth always remains the rotation centre
    controls.target.set(0, 0, 0)

    if (selectedSatellite) {
      wasSelected.current = true
      isReturning.current = false

      const direction = focusTargetRef.current.clone().normalize()
      const desiredCameraPosition = direction.multiplyScalar(6)

      camera.position.lerp(desiredCameraPosition, 0.04)
    }

    else {
      // Start zoom restoration after deselection
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
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2.3, 96, 96]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Atmospheric glow */}
      <mesh scale={1.045}>
        <sphereGeometry args={[2.3, 64, 64]} />
        <meshBasicMaterial
          color="#9b8cff"
          transparent
          opacity={0.10}
        />
      </mesh>

      {/* LEO orbital ring */}
      <mesh rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[2.75, 0.009, 8, 160]} />
        <meshBasicMaterial color="#b69aff" />
      </mesh>

      {/* MEO orbital ring */}
      <mesh rotation={[Math.PI / 2.3, 0.4, 0]}>
        <torusGeometry args={[3.15, 0.008, 8, 160]} />
        <meshBasicMaterial color="#73cfff" />
      </mesh>

      {/* GEO orbital ring */}
      <mesh rotation={[Math.PI / 2, 0.8, 0]}>
        <torusGeometry args={[3.55, 0.008, 8, 160]} />
        <meshBasicMaterial color="#e8bd83" />
      </mesh>

      {/* Moving satellites */}
<Satellite
selected={selectedSatellite === '25544'}
focusTargetRef={focusTargetRef}
isSelected={selectedSatellite === '25544'}
onSelect={() => {
  setSelectedSatellite('25544')
  onPauseChange(true)
  
}}

isPaused={isPaused}
  radius={2.75}
  speed={0.35}
  color="#d7c5ff"
  inclination={0.5}
/>

<Satellite
selected={selectedSatellite === '25338'}
focusTargetRef={focusTargetRef}
isSelected={selectedSatellite === '25338'}
onSelect={() => {
  setSelectedSatellite('25338')
  onPauseChange(true)
}}
isPaused={isPaused}
  radius={3.15}
  speed={0.22}
  color="#73cfff"
  inclination={0.9}
/>

<Satellite
  selected={selectedSatellite === '41866'}
  focusTargetRef={focusTargetRef}
isSelected={selectedSatellite === '41866'}
  onSelect={() => {
    setSelectedSatellite('41866')
    onPauseChange(true)
  }}
  isPaused={isPaused}
  radius={3.55}
  speed={0.14}
  color="#e8bd83"
  inclination={0.3}
/>
{/* Moving orbital debris */}
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
