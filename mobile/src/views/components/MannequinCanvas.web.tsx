import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { DoubleSide } from 'three';

import { BodyProportions } from '@/models/closet';

export type OutfitColors = {
  top: string;
  bottom: string;
  outerwear?: string;
  shoes: string;
  accessory?: string;
  skin?: string;
  hair?: string;
};

const defaultProportions: BodyProportions = {
  armLength: 1,
  hipWidth: 1,
  legLength: 1,
  shoulderWidth: 1,
  torsoLength: 1,
  torsoWidth: 1,
};

function Mannequin({
  colors,
  proportions,
}: {
  colors: OutfitColors;
  proportions: BodyProportions;
}) {
  const skin = colors.skin ?? '#d9b89a';
  const hair = colors.hair ?? '#2b2118';

  return (
    <group position={[0, -1.1, 0]}>
      <mesh position={[0, 2.05, 0]} scale={[0.88, 1.1, 0.82]} castShadow>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.18, -0.02]} scale={[0.94, 0.78, 0.88]} castShadow>
        <sphereGeometry args={[0.275, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshStandardMaterial color={hair} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`ear-${side}`} position={[side * 0.23, 2.03, 0.01]} scale={[0.55, 0.82, 0.36]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.72} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`eye-${side}`} position={[side * 0.08, 2.07, 0.21]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#241B16" roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.015, 0.225]} scale={[0.72, 1, 0.45]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#C99575" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.955, 0.222]} scale={[1.8, 0.38, 0.35]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#A66A61" roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.16, 24]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>

      <mesh position={[0, 1.3, 0]} scale={[proportions.torsoWidth, proportions.torsoLength, 0.92]} castShadow>
        <cylinderGeometry args={[0.34, 0.24, 0.75, 32]} />
        <meshStandardMaterial color={colors.top} roughness={0.85} />
      </mesh>

      {colors.outerwear && (
        <mesh
          position={[0, 1.32, 0]}
          scale={[proportions.torsoWidth, proportions.torsoLength, 0.94]}
          castShadow>
          <cylinderGeometry args={[0.38, 0.3, 0.85, 32, 1, true]} />
          <meshStandardMaterial color={colors.outerwear} roughness={0.9} side={DoubleSide} />
        </mesh>
      )}

      <mesh position={[0, 1.6, 0]} scale={[proportions.shoulderWidth, 1, 0.9]}>
        <sphereGeometry args={[0.34, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={colors.outerwear ?? colors.top} roughness={0.85} />
      </mesh>

      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.42 * proportions.shoulderWidth, 1.45, 0]}
          rotation={[0, 0, side * 0.1]}
          scale={[1, proportions.armLength, 1]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.08, 0.7, 8, 16]} />
            <meshStandardMaterial color={colors.outerwear ?? colors.top} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={skin} roughness={0.7} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.9, 0]} scale={[proportions.hipWidth, 1, 0.94]}>
        <cylinderGeometry args={[0.28, 0.34, 0.18, 32]} />
        <meshStandardMaterial color={colors.bottom} roughness={0.85} />
      </mesh>

      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.13 * proportions.hipWidth, 0.45, 0]}
          scale={[1, proportions.legLength, 1]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.11, 0.75, 8, 16]} />
            <meshStandardMaterial color={colors.bottom} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.55, 0.05]} castShadow>
            <boxGeometry args={[0.18, 0.1, 0.32]} />
            <meshStandardMaterial color={colors.shoes} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {colors.accessory && (
        <mesh position={[0, 1.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.05, 12, 32]} />
          <meshStandardMaterial color={colors.accessory} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

export function MannequinCanvas({
  colors,
  proportions = defaultProportions,
}: {
  colors: OutfitColors;
  proportions?: BodyProportions;
}) {
  const memoColors = useMemo(() => colors, [
    colors.accessory,
    colors.bottom,
    colors.hair,
    colors.outerwear,
    colors.shoes,
    colors.skin,
    colors.top,
  ]);
  const memoProportions = useMemo(() => proportions, [
    proportions.armLength,
    proportions.hipWidth,
    proportions.legLength,
    proportions.shoulderWidth,
    proportions.torsoLength,
    proportions.torsoWidth,
  ]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.3, 5.2], fov: 30 }}
      style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#f3ead9']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#c99a6b" />
      <Suspense fallback={null}>
        <Mannequin colors={memoColors} proportions={memoProportions} />
        <ContactShadows position={[0, -1.12, 0]} opacity={0.35} scale={4} blur={2.4} far={2} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
        rotateSpeed={0.7}
      />
    </Canvas>
  );
}
