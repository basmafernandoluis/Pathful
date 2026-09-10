// Bouton partagé (identité Pathful) : fond plein + ombre douce, très arrondi.
// Appui : scale 0.97 (spring) + ombre atténuée. Deux variantes, palette
// restreinte (accent / neutre). Aucune règle de jeu ici.
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeTokens } from './ThemeProvider';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  small?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function GameButton({
  title,
  onPress,
  variant = 'primary',
  small = false,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const { scheme, accent, accentInk, surface, surfaceInk, fontBold } = useThemeTokens();
  const dark = scheme === 'dark';

  const scale = useSharedValue(1);
  const shadow = useSharedValue(1);
  const animatedScale = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animatedShadow = useAnimatedStyle(() => ({ opacity: shadow.value }));

  const bg = variant === 'primary' ? accent : surface;
  const ink = variant === 'primary' ? accentInk : surfaceInk;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 12, stiffness: 400 });
        shadow.value = withSpring(0.35);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 400 });
        shadow.value = withSpring(1);
      }}
      style={disabled ? { opacity: 0.5 } : undefined}>
      <Animated.View
        style={[
          styles.pill,
          small ? styles.pillSmall : styles.pillLarge,
          { backgroundColor: bg },
          animatedScale,
        ]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.pill,
            small ? styles.pillSmall : styles.pillLarge,
            {
              backgroundColor: bg,
              boxShadow: dark
                ? '0 6px 16px rgba(0, 0, 0, 0.35)'
                : '0 4px 12px rgba(46, 44, 40, 0.25)',
              elevation: 4,
            },
            animatedShadow,
          ]}
        />
        <Text
          style={[
            styles.label,
            small ? styles.labelSmall : styles.labelLarge,
            { color: ink, fontFamily: fontBold },
          ]}>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pillLarge: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  pillSmall: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  label: {
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 16,
  },
  labelSmall: {
    fontSize: 14,
  },
});
