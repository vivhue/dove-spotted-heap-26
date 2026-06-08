import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useState } from "react";

function Avatar({ heightCm, weightKg }) {
  const gltf = useGLTF("/avatar.glb");

  const heightScale = heightCm / 170;
  const widthScale = 1.2 + (weightKg - 60) / 100;

  return (
    <primitive
      object={gltf.scene}
      scale={[widthScale, heightScale * 1.5, widthScale]}
      position={[0, -1.5, 0]}
    />
  );
}

export default function App() {
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(60);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <div style={{ width: "280px", padding: "20px", background: "white" }}>
        <h2>Body Controls</h2>

        <label>Height: {heightCm} cm</label>
        <input
          type="range"
          min="140"
          max="200"
          value={heightCm}
          onChange={(e) => setHeightCm(Number(e.target.value))}
        />
        <input
          type="number"
          value={heightCm}
          onChange={(e) => setHeightCm(Number(e.target.value))}
        />

        <br /><br />

        <label>Weight: {weightKg} kg</label>
        <input
          type="range"
          min="35"
          max="120"
          value={weightKg}
          onChange={(e) => setWeightKg(Number(e.target.value))}
        />
        <input
          type="number"
          value={weightKg}
          onChange={(e) => setWeightKg(Number(e.target.value))}
        />
      </div>

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 1.5, 4] }}>
          <ambientLight intensity={2} />
          <directionalLight position={[2, 2, 2]} />
          <Avatar heightCm={heightCm} weightKg={weightKg} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}