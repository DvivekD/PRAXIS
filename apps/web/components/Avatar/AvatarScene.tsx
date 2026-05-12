"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Float, Edges, Line } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";

interface AbstractCoreProps {
  analyserNode: AnalyserNode | null;
  onInteract?: (actionText: string) => void;
}

// 0. Onboarding: Base scanning mode
function OnboardingCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.5} />
      </mesh>
    </Float>
  );
}

// 1. Engineering: Matrix Wireframe Cube / Gear Structure
function EngineeringCore({ analyserNode }: AbstractCoreProps) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const midRef = useRef<THREE.Mesh>(null);
  const dataArray = useRef(new Uint8Array(128));

  useFrame((state, delta) => {
    if (outerRef.current && innerRef.current && midRef.current) {
      outerRef.current.rotation.y += delta * 0.4;
      outerRef.current.rotation.x += delta * 0.2;
      midRef.current.rotation.z += delta * 0.6;
      innerRef.current.rotation.y -= delta * 0.8;

      let scaleOffset = 0;
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray.current);
        const avg = dataArray.current.reduce((a, b) => a + b, 0) / dataArray.current.length;
        scaleOffset = (avg / 255) * 0.4;
      } else {
        scaleOffset = Math.sin(state.clock.elapsedTime * 4) * 0.1;
      }
      
      const targetScale = 2.2 + scaleOffset;
      outerRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group>
        <mesh ref={outerRef}>
          <boxGeometry args={[1.8, 1.8, 1.8]} />
          <meshPhysicalMaterial color="#000000" metalness={0.9} roughness={0.1} transparent opacity={0.4} />
          <Edges scale={1} threshold={15} color="#00ff41" />
        </mesh>
        <mesh ref={midRef}>
          <octahedronGeometry args={[1.2, 0]} />
          <meshBasicMaterial color="#00ff41" wireframe transparent opacity={0.3} />
        </mesh>
        <mesh ref={innerRef}>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshBasicMaterial color="#00ff41" wireframe />
        </mesh>
      </group>
    </Float>
  );
}

// 2. Data: Explorable Data Pipeline Maze (Massive Network Graph)
function DataCore({ analyserNode, onInteract }: AbstractCoreProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dataArray = useRef(new Uint8Array(128));
  
  // Track how many nodes have been fixed
  const [fixedCount, setFixedCount] = useState(0);

  // Generate deterministic but random-looking nodes spread over a huge area
  const [nodes, setNodes] = useState(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      ] as [number, number, number],
      corrupted: Math.random() > 0.9 // ~10% corrupted
    }));
  });

  // Generate lines connecting nearby nodes
  const lines = useRef<{ start: [number, number, number], end: [number, number, number] }[]>([]);
  if (lines.current.length === 0) {
    const newLines = [];
    for (let i = 0; i < nodes.length; i++) {
      // Connect each node to 2 random other nodes to form a web
      for (let j = 0; j < 2; j++) {
        const target = nodes[Math.floor(Math.random() * nodes.length)];
        newLines.push({ start: nodes[i].position, end: target.position });
      }
    }
    lines.current = newLines;
  }

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02; // slow rotation for massive scale
      
      let intensity = 0;
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray.current);
        intensity = dataArray.current[0] / 255;
      } else {
        intensity = (Math.sin(state.clock.elapsedTime * 2) + 1) * 0.5 * 0.3;
      }

      groupRef.current.children.forEach((child, i) => {
        if (child.type === "Mesh") {
          const mesh = child as THREE.Mesh;
          mesh.position.y += Math.sin(state.clock.elapsedTime * 2 + i) * 0.002 * (1 + intensity * 2);
        }
      });
    }
  });

  const handleNodeClick = (id: number, corrupted: boolean) => {
    if (corrupted) {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, corrupted: false } : n));
      const newCount = fixedCount + 1;
      setFixedCount(newCount);
      
      if (onInteract) {
        if (newCount >= 3) {
          onInteract(`[VICTORY] All critical data pipelines realigned. Network stable.`);
        } else {
          onInteract(`Realigned corrupted data node cluster-${id}. (${3 - newCount} remaining)`);
        }
      }
    }
  };

  return (
    <group ref={groupRef}>
      {lines.current.map((line, i) => (
        <Line 
          key={i} 
          points={[line.start, line.end]} 
          color="#06b6d4" 
          lineWidth={1} 
          transparent 
          opacity={0.15} 
        />
      ))}
      {nodes.map((node) => (
        <mesh 
          key={node.id} 
          position={node.position}
          onClick={(e) => {
            e.stopPropagation();
            handleNodeClick(node.id, node.corrupted);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = node.corrupted ? 'crosshair' : 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshPhysicalMaterial 
            color={node.corrupted ? "#ef4444" : "#06b6d4"} 
            emissive={node.corrupted ? "#b91c1c" : "#0891b2"}
            emissiveIntensity={node.corrupted ? 1.5 : 0.5}
            transparent 
            opacity={0.9}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      ))}
      {/* Central Hub */}
      <mesh>
        <octahedronGeometry args={[3, 1]} />
        <meshPhysicalMaterial color="#020202" metalness={0.9} roughness={0.1} transparent opacity={0.8} />
        <Edges scale={1} threshold={15} color="#06b6d4" />
      </mesh>
    </group>
  );
}

// 3. Sales: Morphing Audio-Reactive Sphere (Voice Agent)
function SalesCore({ analyserNode }: AbstractCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const dataArray = useRef(new Uint8Array(128));

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      
      let scaleOffset = 0;
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray.current);
        const avg = dataArray.current.reduce((a, b) => a + b, 0) / dataArray.current.length;
        scaleOffset = (avg / 255) * 0.5;
      } else {
        // Voice pulse simulation
        scaleOffset = Math.sin(state.clock.elapsedTime * 8) * 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      }
      
      const targetScale = 2.4 + scaleOffset;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.3);
    }
  });

  return (
    <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshPhysicalMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={0.2}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </Float>
  );
}

// 4. Product: Interlocking Torus Knots
function ProductCore({ analyserNode }: AbstractCoreProps) {
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);
  const dataArray = useRef(new Uint8Array(128));

  useFrame((state, delta) => {
    if (meshRef1.current && meshRef2.current) {
      meshRef1.current.rotation.x += delta * 0.4;
      meshRef1.current.rotation.y += delta * 0.5;
      meshRef2.current.rotation.x -= delta * 0.3;
      meshRef2.current.rotation.z -= delta * 0.6;

      let pulse = 0;
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray.current);
        pulse = (dataArray.current[10] / 255) * 0.3;
      } else {
        pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      }

      const s1 = 1.8 + pulse;
      const s2 = 1.5 + pulse;
      meshRef1.current.scale.lerp(new THREE.Vector3(s1, s1, s1), 0.2);
      meshRef2.current.scale.lerp(new THREE.Vector3(s2, s2, s2), 0.2);
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <group>
        <mesh ref={meshRef1}>
          <torusGeometry args={[1.5, 0.2, 16, 100]} />
          <meshPhysicalMaterial color="#818cf8" emissive="#4f46e5" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh ref={meshRef2} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.2, 16, 100]} />
          <meshPhysicalMaterial color="#a78bfa" emissive="#7c3aed" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

export default function AvatarScene({ analyserNode, domain = "engineering", onInteract }: { analyserNode: AnalyserNode | null, domain?: string, onInteract?: (actionText: string) => void }) {
  
  const renderCore = () => {
    switch (domain) {
      case "onboarding": return <OnboardingCore />;
      case "sales": return <SalesCore analyserNode={analyserNode} onInteract={onInteract} />;
      case "product": return <ProductCore analyserNode={analyserNode} onInteract={onInteract} />;
      case "data": return <DataCore analyserNode={analyserNode} onInteract={onInteract} />;
      case "engineering":
      default:
        return <EngineeringCore analyserNode={analyserNode} onInteract={onInteract} />;
    }
  };

  const getThemeColor = () => {
    switch (domain) {
      case "onboarding": return "#ffffff";
      case "sales": return "#f59e0b";
      case "product": return "#818cf8";
      case "data": return "#06b6d4";
      case "engineering":
      default: return "#00ff41";
    }
  };

  const themeColor = getThemeColor();

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "transparent", overflow: "hidden", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <color attach="background" args={["#020202"]} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={themeColor} />
        
        <Suspense fallback={null}>
          {renderCore()}
          <Environment preset="city" />
          <ContactShadows position={[0, -1.8, 0]} opacity={0.4} scale={10} blur={2} far={4} color={themeColor} />
        </Suspense>

        <OrbitControls 
          enableZoom={true} 
          enablePan={true}
          autoRotate={domain !== "data"} 
          autoRotateSpeed={0.5}
          maxDistance={30}
          minDistance={1}
        />
      </Canvas>
      
      {/* HUD Overlay */}
      <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", pointerEvents: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ color: themeColor, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", fontWeight: "bold" }}>Observer Mode</div>
          <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>Analyzing cognitive load & heuristics...</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ position: "relative", display: "flex", height: 12, width: 12 }}>
            <span style={{ backgroundColor: themeColor, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", position: "absolute", display: "inline-flex", height: "100%", width: "100%", borderRadius: "9999px", opacity: 0.75 }}></span>
            <span style={{ backgroundColor: themeColor, position: "relative", display: "inline-flex", borderRadius: "9999px", height: 12, width: 12 }}></span>
          </span>
          <span style={{ color: themeColor, fontSize: 12, fontFamily: "monospace" }}>LIVE</span>
        </div>
      </div>
    </div>
  );
}
