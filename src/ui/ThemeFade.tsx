// Juice « changement de thème » : fondu enchaîné (~250 ms), jamais brutal.
// Au changement clair/sombre, un voile plein écran de l'ancien fond recouvre
// l'app puis s'estompe. Aucune règle de jeu ici.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { bgTopFor, useAppTheme } from './ThemeProvider';

const DURATION_MS = 250;

export function ThemeFade() {
  const current = useAppTheme();
  const [overlay, setOverlay] = useState<{ color: string; key: number } | null>(null);
  const prevRef = useRef<'light' | 'dark'>(current);
  const keyRef = useRef(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (prevRef.current === current) return;
    const prev = prevRef.current;
    prevRef.current = current;
    keyRef.current += 1;
    const key = keyRef.current;
    opacity.value = 1;
    setOverlay({ color: bgTopFor(prev), key });
    opacity.value = withTiming(0, { duration: DURATION_MS }, (finished) => {
      // Ne retire que le voile courant (bascule rapide aller-retour safe).
      if (finished && keyRef.current === key) runOnJS(setOverlay)(null);
    });
  }, [current, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!overlay) return null;
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Animated.View
        key={overlay.key}
        style={[styles.fill, { backgroundColor: overlay.color }, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
