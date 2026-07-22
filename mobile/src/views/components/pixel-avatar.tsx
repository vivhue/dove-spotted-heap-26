import { Pressable, StyleSheet, View } from 'react-native';

import { defaultPixelAvatar, PixelAvatarConfig } from '@/models/closet';
import { closetTheme } from '@/views/components/closet-theme';

type Props = {
  config?: PixelAvatarConfig;
  interactive?: boolean;
  pose?: 'idle' | 'wave';
  scale?: number;
  onPress?: () => void;
};

type Block = {
  color: string;
  h?: number;
  w?: number;
  x: number;
  y: number;
};

const pixel = 5;

export function PixelAvatar({ config, interactive = false, onPress, pose = 'idle', scale = 1 }: Props) {
  const avatar = { ...defaultPixelAvatar, ...(config ?? {}) };
  const blocks = buildBlocks(avatar, pose);
  const content = (
    <View style={[styles.avatar, { height: 34 * pixel * scale, width: 24 * pixel * scale }]}>
      {blocks.map((block, index) => (
        <View
          key={`${block.x}-${block.y}-${index}`}
          style={[
            styles.block,
            {
              backgroundColor: block.color,
              height: (block.h ?? 1) * pixel * scale,
              left: block.x * pixel * scale,
              top: block.y * pixel * scale,
              width: (block.w ?? 1) * pixel * scale,
            },
          ]}
        />
      ))}
    </View>
  );

  if (!interactive) {
    return content;
  }

  return (
    <Pressable style={({ pressed }) => [styles.pressable, pressed && styles.pressed]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function buildBlocks(config: PixelAvatarConfig, pose: Props['pose']) {
  const skin = config.skinColor;
  const hair = hairColor(config.hair);
  const outfit = config.outfitColor;
  const outline = closetTheme.ink;
  const shoe = '#1B2438';
  const body = bodyShape(config.body);
  const head = headShape(config.face);
  const blocks: Block[] = [];

  rect(blocks, outline, head.x - 1, 4, head.w + 2, head.h + 2);
  rect(blocks, skin, head.x, 5, head.w, head.h);
  addEars(blocks, config, skin, head);
  addHair(blocks, config.hair, hair, head);
  addFace(blocks, config, outline, head);

  rect(blocks, outline, body.x - 1, 16, body.w + 2, 9);
  rect(blocks, outfit, body.x, 16, body.w, 8);
  rect(blocks, outfit, body.x + 1, 15, body.w - 2, 1);

  if (pose === 'wave') {
    rect(blocks, skin, body.x - 4, 15, 2, 6);
    rect(blocks, skin, body.x - 5, 13, 2, 2);
    rect(blocks, skin, body.x + body.w + 1, 17, 2, 7);
  } else {
    rect(blocks, skin, body.x - 3, 17, 2, 7);
    rect(blocks, skin, body.x + body.w + 1, 17, 2, 7);
  }

  rect(blocks, outline, body.x + 1, 24, Math.max(2, Math.floor(body.w / 2) - 1), 1);
  rect(blocks, outline, body.x + Math.ceil(body.w / 2), 24, Math.max(2, Math.floor(body.w / 2) - 1), 1);
  rect(blocks, outfit, body.x + 1, 25, 3, 5);
  rect(blocks, outfit, body.x + body.w - 4, 25, 3, 5);
  rect(blocks, shoe, body.x, 30, 5, 2);
  rect(blocks, shoe, body.x + body.w - 5, 30, 5, 2);

  return blocks;
}

function rect(blocks: Block[], color: string, x: number, y: number, w: number, h: number) {
  blocks.push({ color, h, w, x, y });
}

function bodyShape(body: PixelAvatarConfig['body']) {
  if (body === 'slim') return { w: 8, x: 8 };
  if (body === 'strong') return { w: 13, x: 6 };
  if (body === 'curvy') return { w: 12, x: 6 };
  return { w: 10, x: 7 };
}

function headShape(face: PixelAvatarConfig['face']) {
  if (face === 'sharp') return { h: 8, w: 8, x: 8 };
  if (face === 'round') return { h: 8, w: 10, x: 7 };
  return { h: 8, w: 9, x: 7 };
}

function hairColor(hair: PixelAvatarConfig['hair']) {
  if (hair === 'spikes') return '#D65B3D';
  if (hair === 'cap') return '#253B67';
  if (hair === 'waves') return '#5B3A76';
  if (hair === 'short') return '#26324C';
  return '#2B2335';
}

function addEars(blocks: Block[], config: PixelAvatarConfig, skin: string, head: { h: number; w: number; x: number }) {
  const y = config.ears === 'pointed' ? 7 : 8;
  const h = config.ears === 'round' ? 2 : 1;
  rect(blocks, skin, head.x - 2, y, 2, h);
  rect(blocks, skin, head.x + head.w, y, 2, h);
}

function addHair(blocks: Block[], hair: PixelAvatarConfig['hair'], color: string, head: { h: number; w: number; x: number }) {
  if (hair === 'cap') {
    rect(blocks, color, head.x - 1, 4, head.w + 2, 2);
    rect(blocks, color, head.x + head.w - 1, 6, 3, 1);
    return;
  }

  rect(blocks, color, head.x - 1, 4, head.w + 2, 2);
  if (hair === 'bob') {
    rect(blocks, color, head.x - 1, 6, 2, 6);
    rect(blocks, color, head.x + head.w - 1, 6, 2, 6);
  }
  if (hair === 'waves') {
    rect(blocks, color, head.x - 2, 6, 2, 5);
    rect(blocks, color, head.x + head.w - 1, 6, 3, 4);
    rect(blocks, color, head.x + 1, 3, head.w - 2, 1);
  }
  if (hair === 'spikes') {
    rect(blocks, color, head.x, 3, 2, 1);
    rect(blocks, color, head.x + 3, 2, 2, 2);
    rect(blocks, color, head.x + 7, 3, 2, 1);
  }
}

function addFace(blocks: Block[], config: PixelAvatarConfig, color: string, head: { h: number; w: number; x: number }) {
  const leftEye = config.eyes === 'wink' ? '-' : 'dot';
  addEye(blocks, color, head.x + 2, 8, leftEye);
  addEye(blocks, color, head.x + head.w - 3, 8, config.eyes === 'calm' ? 'dash' : 'dot');

  if (config.nose === 'line') rect(blocks, color, head.x + Math.floor(head.w / 2), 10, 1, 2);
  if (config.nose === 'button') rect(blocks, color, head.x + Math.floor(head.w / 2), 10, 2, 1);
  if (config.nose === 'dot') rect(blocks, color, head.x + Math.floor(head.w / 2), 10, 1, 1);

  if (config.mouth === 'smile') rect(blocks, color, head.x + 3, 12, head.w - 6, 1);
  if (config.mouth === 'neutral') rect(blocks, color, head.x + 3, 12, head.w - 5, 1);
  if (config.mouth === 'open') rect(blocks, color, head.x + 4, 12, 2, 2);
}

function addEye(blocks: Block[], color: string, x: number, y: number, kind: 'dash' | 'dot' | '-') {
  rect(blocks, color, x, y, kind === 'dot' ? 1 : 2, 1);
}

const styles = StyleSheet.create({
  avatar: {
    position: 'relative',
  },
  block: {
    position: 'absolute',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: -4 }, { scale: 1.03 }],
  },
});
