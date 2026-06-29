import { Canvas } from '@react-three/fiber/native';
import { OrbitControls, useGLTF } from '@react-three/drei/native';
import { Suspense, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type OutfitOption = {
  label: string;
  url: string | null;
};

type AvatarViewerProps = {
  avatarUrl: string;
  outfits?: OutfitOption[];
};

const defaultOutfits: OutfitOption[] = [
  { label: 'None', url: null },
  { label: 'Casual Tee', url: 'https://your-cdn.example/outfits/casual-tee.glb' },
  { label: 'Hoodie', url: 'https://your-cdn.example/outfits/hoodie.glb' },
];

function AvatarModel({ avatarUrl, outfitUrl }: { avatarUrl: string; outfitUrl: string | null }) {
  const { scene: body } = useGLTF(avatarUrl);
  const outfit = outfitUrl ? useGLTF(outfitUrl).scene : null;

  return (
    <group position={[0, -1.15, 0]}>
      <primitive object={body} />
      {outfit && <primitive object={outfit} />}
    </group>
  );
}

export function AvatarViewer({ avatarUrl, outfits = defaultOutfits }: AvatarViewerProps) {
  const [activeOutfitUrl, setActiveOutfitUrl] = useState<string | null>(null);
  const activeLabel = useMemo(
    () => outfits.find((outfit) => outfit.url === activeOutfitUrl)?.label ?? 'None',
    [activeOutfitUrl, outfits]
  );

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Canvas camera={{ position: [0, 1.15, 3.4], fov: 34 }}>
          <color attach="background" args={['#f3ead9']} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, 1.5, -2]} intensity={0.35} />
          <Suspense fallback={null}>
            <AvatarModel avatarUrl={avatarUrl} outfitUrl={activeOutfitUrl} />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={2.2} maxDistance={4.2} />
        </Canvas>
      </View>

      <View style={styles.controls}>
        <Text style={styles.title}>Outfit: {activeLabel}</Text>
        <View style={styles.outfitRow}>
          {outfits.map((outfit) => {
            const selected = outfit.url === activeOutfitUrl;

            return (
              <Pressable
                key={outfit.label}
                onPress={() => setActiveOutfitUrl(outfit.url)}
                style={({ pressed }) => [
                  styles.outfitButton,
                  selected && styles.outfitButtonSelected,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.outfitText, selected && styles.outfitTextSelected]}>
                  {outfit.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F1E7',
    flex: 1,
  },
  stage: {
    flex: 1,
    minHeight: 420,
  },
  controls: {
    backgroundColor: '#FFFDF9',
    borderTopColor: '#E0D5C2',
    borderTopWidth: 1,
    gap: 12,
    padding: 16,
  },
  title: {
    color: '#2B2118',
    fontSize: 14,
    fontWeight: '900',
  },
  outfitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outfitButton: {
    backgroundColor: '#F7F1E7',
    borderColor: '#E0D5C2',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  outfitButtonSelected: {
    backgroundColor: '#2B2118',
    borderColor: '#2B2118',
  },
  outfitText: {
    color: '#A89A85',
    fontSize: 12,
    fontWeight: '900',
  },
  outfitTextSelected: {
    color: '#F7F1E7',
  },
  pressed: {
    opacity: 0.65,
  },
});
