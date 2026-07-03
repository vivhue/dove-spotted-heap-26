import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useSplashAnimation() {
  const intro = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(intro, {
        toValue: 1,
        friction: 7,
        tension: 54,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, {
            toValue: 1,
            duration: 2600,
            useNativeDriver: true,
          }),
          Animated.timing(float, {
            toValue: 0,
            duration: 2600,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [float, intro]);

  return {
    float,
    intro,
  };
}

