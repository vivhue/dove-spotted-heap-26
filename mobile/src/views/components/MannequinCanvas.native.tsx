import { StyleSheet, View } from 'react-native';

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

export function MannequinCanvas({
  colors,
  proportions = defaultProportions,
}: {
  colors: OutfitColors;
  proportions?: BodyProportions;
}) {
  const skin = colors.skin ?? '#d9b89a';
  const hair = colors.hair ?? '#2b2118';

  return (
    <View style={styles.stage}>
      <View style={styles.headWrap}>
        <View style={[styles.ear, styles.leftEar, { backgroundColor: skin }]} />
        <View style={[styles.ear, styles.rightEar, { backgroundColor: skin }]} />
        <View style={[styles.head, { backgroundColor: skin }]}>
          <View style={[styles.hair, { backgroundColor: hair }]} />
          <View style={styles.face}>
            <View style={styles.eyes}>
              <View style={[styles.eye, { backgroundColor: hair }]} />
              <View style={[styles.eye, { backgroundColor: hair }]} />
            </View>
            <View style={[styles.nose, { backgroundColor: '#C99575' }]} />
            <View style={[styles.mouth, { backgroundColor: '#A66A61' }]} />
          </View>
        </View>
      </View>
      <View style={[styles.neck, { backgroundColor: skin }]} />
      <View
        style={[
          styles.shoulders,
          {
            backgroundColor: colors.outerwear ?? colors.top,
            width: 96 * proportions.shoulderWidth,
          },
        ]}
      />
      <View
        style={[
          styles.torso,
          {
            backgroundColor: colors.top,
            height: 94 * proportions.torsoLength,
            width: 72 * proportions.torsoWidth,
          },
        ]}>
        {colors.outerwear && <View style={[styles.outerwear, { borderColor: colors.outerwear }]} />}
      </View>
      <View
        style={[
          styles.arms,
          {
            gap: 96 * proportions.shoulderWidth,
            marginTop: -112 * proportions.torsoLength,
          },
        ]}>
        <View
          style={[
            styles.arm,
            {
              backgroundColor: colors.outerwear ?? colors.top,
              height: 96 * proportions.armLength,
            },
          ]}>
          <View style={[styles.hand, { backgroundColor: skin }]} />
        </View>
        <View
          style={[
            styles.arm,
            {
              backgroundColor: colors.outerwear ?? colors.top,
              height: 96 * proportions.armLength,
            },
          ]}>
          <View style={[styles.hand, { backgroundColor: skin }]} />
        </View>
      </View>
      {colors.accessory && <View style={[styles.accessory, { backgroundColor: colors.accessory }]} />}
      <View
        style={[
          styles.hips,
          {
            backgroundColor: colors.bottom,
            width: 70 * proportions.hipWidth,
          },
        ]}
      />
      <View style={styles.legs}>
        <View
          style={[
            styles.leg,
            {
              backgroundColor: colors.bottom,
              height: 92 * proportions.legLength,
            },
          ]}>
          <View style={[styles.shoe, { backgroundColor: colors.shoes }]} />
        </View>
        <View
          style={[
            styles.leg,
            {
              backgroundColor: colors.bottom,
              height: 92 * proportions.legLength,
            },
          ]}>
          <View style={[styles.shoe, { backgroundColor: colors.shoes }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  headWrap: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 3,
  },
  head: {
    borderRadius: 30,
    height: 58,
    overflow: 'hidden',
    width: 50,
    zIndex: 3,
  },
  ear: {
    borderRadius: 8,
    height: 16,
    position: 'absolute',
    top: 24,
    width: 10,
  },
  leftEar: {
    left: -6,
  },
  rightEar: {
    right: -6,
  },
  hair: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 10,
    height: 22,
    width: '100%',
  },
  face: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 5,
  },
  eyes: {
    flexDirection: 'row',
    gap: 13,
  },
  eye: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  nose: {
    borderRadius: 3,
    height: 7,
    width: 5,
  },
  mouth: {
    borderRadius: 4,
    height: 3,
    width: 12,
  },
  neck: {
    borderRadius: 8,
    height: 18,
    marginTop: -2,
    width: 18,
    zIndex: 2,
  },
  shoulders: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    height: 30,
    marginTop: -1,
    width: 96,
  },
  torso: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    height: 94,
    marginTop: -1,
    position: 'relative',
    width: 72,
  },
  outerwear: {
    borderRadius: 32,
    borderWidth: 8,
    bottom: -4,
    left: -8,
    position: 'absolute',
    right: -8,
    top: -18,
  },
  arms: {
    flexDirection: 'row',
    gap: 96,
    marginTop: -112,
    zIndex: 1,
  },
  arm: {
    alignItems: 'center',
    borderRadius: 14,
    height: 96,
    justifyContent: 'flex-end',
    width: 18,
  },
  hand: {
    borderRadius: 9,
    height: 18,
    marginBottom: -7,
    width: 18,
  },
  accessory: {
    borderRadius: 8,
    height: 10,
    marginTop: 14,
    position: 'absolute',
    top: '35%',
    width: 44,
    zIndex: 5,
  },
  hips: {
    borderRadius: 18,
    height: 26,
    marginTop: 8,
    width: 70,
  },
  legs: {
    flexDirection: 'row',
    gap: 14,
    marginTop: -1,
  },
  leg: {
    alignItems: 'center',
    borderRadius: 14,
    height: 92,
    justifyContent: 'flex-end',
    width: 24,
  },
  shoe: {
    borderRadius: 5,
    height: 12,
    marginBottom: -4,
    width: 34,
  },
});
