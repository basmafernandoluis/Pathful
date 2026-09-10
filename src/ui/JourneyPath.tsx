// Piste sinueuse de sélection de niveaux ("journey path").
// Juice « chemin de progression » : le nœud nouvellement débloqué (le courant)
// apparaît avec un rebond (spring avec overshoot), les autres sont fixes.
// Aucun état de jeu ici — juste la navigation. Palette sobre, clair + sombre.
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import type { Level } from '../logic/types';
import { currentLevelIndex, levelStateAt, type LevelState } from '../services/levels';
import { useAppTheme } from './ThemeProvider';

const ROW_H = 92;
const NODE = 58;
const CURRENT_OUTER = 76;
const TRACK_W = 6;
// Fréquence de la sinusoïde : ~1 ondulation tous les 7 niveaux.
const PHASE_STEP = 0.9;

type Palette = {
  background: string;
  ink: string;
  muted: string;
  trackDone: string;
  trackTodo: string;
  doneFill: string;
  doneText: string;
  currentFill: string;
  currentRing: string;
  currentText: string;
  lockedFill: string;
  lockedText: string;
};

const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#F5F2EB',
    ink: '#2E2C28',
    muted: '#8A867C',
    trackDone: '#9DB89A',
    trackTodo: '#D9D3C3',
    doneFill: '#6F8F6A',
    doneText: '#FFFFFF',
    currentFill: '#FCFBF7',
    currentRing: '#4F7A6A',
    currentText: '#3E6355',
    lockedFill: '#E7E2D4',
    lockedText: '#AAA496',
  },
  dark: {
    background: '#161511',
    ink: '#ECE7DB',
    muted: '#8E8878',
    trackDone: '#5E7A5C',
    trackTodo: '#33302A',
    doneFill: '#5E7A5C',
    doneText: '#F2EEE3',
    currentFill: '#201E19',
    currentRing: '#8FB5A3',
    currentText: '#A9CBBD',
    lockedFill: '#23211C',
    lockedText: '#5D594E',
  },
};

/** Un nœud : shared value propre (identité stable par key, pas de hooks en boucle). */
function NodeItem({
  index,
  size,
  left,
  state,
  palette,
  locked,
  celebrate,
  onPress,
}: {
  index: number;
  size: number;
  left: number;
  state: LevelState;
  palette: Palette;
  locked: boolean;
  /** True pour le seul nœud nouvellement débloqué : rebond à l'apparition. */
  celebrate: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(celebrate ? 0 : 1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (celebrate) {
      scale.value = withDelay(350, withSpring(1, { damping: 7, stiffness: 140 }));
    }
  }, [celebrate, scale]);

  return (
    <Animated.View
      style={[
        styles.node,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          backgroundColor:
            state === 'done'
              ? palette.doneFill
              : state === 'current'
                ? palette.currentFill
                : palette.lockedFill,
          borderWidth: state === 'current' ? 3 : 0,
          borderColor: palette.currentRing,
          opacity: locked ? 0.75 : 1,
        },
        animatedStyle,
      ]}>
      <Pressable
        disabled={locked}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Niveau ${index + 1}, ${state}`}
        style={styles.nodePress}>
        <Text
          style={[
            styles.number,
            {
              color:
                state === 'done'
                  ? palette.doneText
                  : state === 'current'
                    ? palette.currentText
                    : palette.lockedText,
            },
          ]}>
          {index + 1}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

type Props = {
  levels: Level[];
  completedIds: string[];
  onSelect: (level: Level) => void;
};

export function JourneyPath({ levels, completedIds, onSelect }: Props) {
  const scheme = useAppTheme();
  const palette = PALETTES[scheme];
  const { width } = useWindowDimensions();
  const amp = Math.min(96, width * 0.28);

  const scrollRef = useRef<ScrollView | null>(null);
  const viewportH = useRef(0);
  const didScroll = useRef(false);

  // Position horizontale de chaque nœud (décalage / centre, sinusoïde).
  // Les enfants absolus se placent depuis le bord gauche : on ajoute cx.
  const cx = width / 2;
  const xs = levels.map((_, i) => Math.sin(i * PHASE_STEP) * amp);
  const centerY = (i: number) => i * ROW_H + 12 + NODE / 2;
  const totalH = levels.length * ROW_H + 24;
  // Premier niveau jouable-non-terminé (le seul qui rebondit) ; repli = fin.
  const firstCurrent =
    currentLevelIndex(completedIds) >= 0
      ? currentLevelIndex(completedIds)
      : levels.length - 1;

  const scrollToCurrent = () => {
    if (didScroll.current || viewportH.current === 0) return;
    didScroll.current = true;
    const target = firstCurrent * ROW_H + ROW_H / 2 - viewportH.current / 2;
    scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: false });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={{ height: totalH }}
      onLayout={(e) => {
        viewportH.current = e.nativeEvent.layout.height;
      }}
      onContentSizeChange={scrollToCurrent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.track}>
        {/* Connecteurs entre centres de nœuds consécutifs (derrière les nœuds). */}
        {levels.slice(0, -1).map((_, i) => {
          const dx = xs[i + 1] - xs[i];
          const dy = centerY(i + 1) - centerY(i);
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
          const done = levelStateAt(i, completedIds) === 'done';
          return (
            <View
              key={`c-${i}`}
              style={[
                styles.connector,
                {
                  width: TRACK_W,
                  height: len,
                  left: cx + (xs[i] + xs[i + 1]) / 2 - TRACK_W / 2,
                  top: (centerY(i) + centerY(i + 1)) / 2 - len / 2,
                  backgroundColor: done ? palette.trackDone : palette.trackTodo,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}

        {/* Nœuds. */}
        {levels.map((level, i) => {
          const state = levelStateAt(i, completedIds);
          const size = state === 'current' ? CURRENT_OUTER : NODE;
          const locked = state === 'locked';
          return (
            <View key={level.id} style={[styles.row, { top: i * ROW_H + 12, height: ROW_H }]}>
              <NodeItem
                index={i}
                size={size}
                left={cx + xs[i] - size / 2}
                state={state}
                palette={palette}
                locked={locked}
                celebrate={i === firstCurrent}
                onPress={() => onSelect(level)}
              />
              {!locked && (
                <Text
                  style={[
                    styles.meta,
                    {
                      left: cx + xs[i] - 40,
                      top: (state === 'current' ? CURRENT_OUTER : NODE) + 4,
                      color: palette.muted,
                    },
                  ]}>
                  {level.width}×{level.height}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  // Référentiel centré : les `left` des enfants sont relatifs au centre.
  track: {
    flex: 1,
    alignItems: 'center',
  },
  connector: {
    position: 'absolute',
    borderRadius: 3,
  },
  row: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  node: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePress: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 20,
    fontWeight: '600',
  },
  meta: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    fontSize: 12,
  },
});
