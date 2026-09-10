// Fond d'écran partagé (identité Pathful) : dégradé vertical subtil + grain
// très léger — de la profondeur sans noir plat, lisibilité préservée.
// Skia déjà en dépendances (pas de nouveau module natif) + expo-image.
// Usage : premier enfant d'un écran, le contenu passe par-dessus.
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useThemeTokens } from './ThemeProvider';

// require() n'est pas typé (pas de @types/node) : déclaration locale au module.
declare const require: (id: string) => number;

export function ScreenBackground() {
  const { bgTop, bgBottom, grainOpacity } = useThemeTokens();
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={styles.fill}>
      <Canvas style={styles.fill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[bgTop, bgBottom]} />
        </Rect>
      </Canvas>
      <Image
        source={require('../../assets/images/grain.png')}
        style={[styles.fill, { opacity: grainOpacity }]}
        contentFit="cover"
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
