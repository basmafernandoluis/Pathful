// Plateau Skia + tracé tactile.
// - Géométrie : grid-geometry.ts (pointToCell = seul traducteur geste → case).
// - Validité : src/state/gameStore.ts (gameplay-rules.ts exclusivement).
// Ce composant ne contient aucune règle : il convertit, délègue, affiche.
import { Canvas } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import type { CellPos, Level } from '../logic/types';
import { playComplete, playVictory } from '../services/audio';
import { useGameStore } from '../state/gameStore';
import { useSettingsStore } from '../state/settingsStore';
import { BoardGrid } from './BoardGrid';
import { SnakePaths } from './SnakePaths';
import { VictoryOverlay } from './VictoryOverlay';
import { VictoryStats } from './VictoryStats';
import { computeLayout, pointToCell, type GridLayout } from './grid-geometry';
import { useAppTheme, useThemeTokens } from './ThemeProvider';

type Props = {
  level: Level;
  maxWidth?: number;
  maxHeight?: number;
};

// --- Passerelle geste (thread UI) → store (thread JS), via runOnJS ---
// Ces trois fonctions tournent sur JS : elles seules touchent le store et les
// ponts natifs. Le worklet du geste ne fait que détecter les transitions de
// case et les appeler — jamais à chaque frame, seulement par case validée.
// La validité reste 100 % gameplay-rules.ts (via le store), inchangée.
function jsBegin(cell: CellPos) {
  useGameStore.getState().beginAt(cell);
}

function jsMove(cell: CellPos) {
  const st = useGameStore.getState();
  const res = st.moveTo(cell);
  const vibration = useSettingsStore.getState().vibration;
  if (res.kind === 'extended' && vibration) {
    // Fire-and-forget : le geste (et le son) n'attendent jamais le moteur haptique.
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Module natif absent (dev build antérieur à expo-haptics) : ignoré.
      });
    } catch {
      // Idem, version synchrone : le tracé continue sans vibration.
    }
  }
  if (res.completedHeadId !== null) {
    if (useSettingsStore.getState().sound) playComplete();
    if (vibration) {
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
          // Idem : builds sans module natif.
        });
      } catch {
        // Idem, version synchrone.
      }
    }
  }
}

function jsEnd() {
  useGameStore.getState().endStroke();
}

/** Chiffres des têtes : fixes par niveau/layout/thème — jamais re-rendus pendant le tracé. */
const HeadNumbers = memo(function HeadNumbers({
  level,
  layout,
  numSize,
  dark,
  fontFamily,
}: {
  level: Level;
  layout: GridLayout;
  numSize: number;
  dark: boolean;
  fontFamily: string | undefined;
}) {
  return (
    <>
      {level.heads.map((h) => {
        const cx = layout.originX + h.col * layout.cellSize + layout.cellSize / 2;
        const cy = layout.originY + h.row * layout.cellSize + layout.cellSize / 2;
        return (
          <View
            key={`num-${h.id}`}
            pointerEvents="none"
            style={[
              styles.numWrap,
              {
                left: cx - layout.cellSize / 2,
                top: cy - layout.cellSize / 2,
                width: layout.cellSize,
                height: layout.cellSize,
              },
            ]}>
            <Text
              style={[
                styles.num,
                { fontSize: numSize, color: dark ? '#1E1C17' : '#FFFFFF', fontFamily },
              ]}>
              {h.number}
            </Text>
          </View>
        );
      })}
    </>
  );
});

export function GridCanvas({ level, maxWidth, maxHeight }: Props) {
  const scheme = useAppTheme();
  const { fontDisplay } = useThemeTokens();
  const dark = scheme === 'dark';
  const { width: winW, height: winH } = useWindowDimensions();
  const paths = useGameStore((s) => s.paths);
  const pulse = useGameStore((s) => s.pulse);
  const hintPath = useGameStore((s) => s.hintPath);
  const solved = useGameStore((s) => s.solved);
  const moves = useGameStore((s) => s.moves);
  const soundOn = useSettingsStore((s) => s.sound);
  // Indices issus de la sauvegarde (persistés par niveau), pas du store de tracé.
  const hintsUsed = useSettingsStore((s) => s.hints[level.id] ?? 0);

  const availW = maxWidth ?? winW - 32;
  const availH = maxHeight ?? winH - 320;
  const layout = useMemo(
    () => computeLayout(level.width, level.height, availW, availH),
    [level.width, level.height, availW, availH],
  );
  // Miroir du layout lisible depuis le worklet (les refs JS n'y sont pas accessibles).
  const layoutSV = useSharedValue<GridLayout>(layout);
  useEffect(() => {
    layoutSV.value = layout;
  }, [layout, layoutSV]);
  // Dernière case transmise au store : filtre les frames sans changement de case.
  const lastCellSV = useSharedValue<CellPos | null>(null);
  useEffect(() => {
    lastCellSV.value = null;
  }, [level, lastCellSV]);

  const numSize = Math.max(12, Math.floor(layout.cellSize * 0.42));

  // Séquence de victoire : zoom-pulse léger du plateau + carillon, une fois
  // par résolution (la vague, les particules et les stats sont montées ci-dessous
  // quand `solved` devient vrai).
  const boardScale = useSharedValue(1);
  const victoryFired = useRef(false);
  useEffect(() => {
    if (solved && !victoryFired.current) {
      victoryFired.current = true;
      boardScale.value = withSequence(withSpring(1.03), withSpring(1));
      if (soundOn) playVictory();
    }
    if (!solved) victoryFired.current = false;
  }, [solved, soundOn, boardScale]);
  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  // Geste en worklet (thread UI) : détection + filtrage par case ici, validation
  // côté store (thread JS) via runOnJS UNIQUEMENT sur transition de case.
  // runOnJS préserve l'ordre d'appel → les validations restent ordonnées.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((e) => {
          'worklet';
          const cell = pointToCell(e.x, e.y, layoutSV.value, level.width, level.height);
          if (cell) {
            lastCellSV.value = cell;
            runOnJS(jsBegin)(cell);
          }
        })
        .onUpdate((e) => {
          'worklet';
          const cell = pointToCell(e.x, e.y, layoutSV.value, level.width, level.height);
          if (!cell) return;
          const last = lastCellSV.value;
          if (last && last.row === cell.row && last.col === cell.col) return;
          lastCellSV.value = cell;
          runOnJS(jsMove)(cell);
        })
        .onEnd(() => {
          'worklet';
          lastCellSV.value = null;
          runOnJS(jsEnd)();
        }),
    [level.width, level.height, layoutSV, lastCellSV],
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.wrap, { width: layout.boardW, height: layout.boardH }, boardAnimatedStyle]}>
        <Canvas style={styles.canvas}>
          <BoardGrid level={level} layout={layout} dark={dark} paths={paths} hintPath={hintPath} />
          <SnakePaths level={level} paths={paths} layout={layout} pulse={pulse} />
        </Canvas>
        {solved && (
          <>
            <VictoryOverlay layout={layout} dark={dark} />
            <VictoryStats moves={moves} hints={hintsUsed} dark={dark} />
          </>
        )}
        <HeadNumbers
          level={level}
          layout={layout}
          numSize={numSize}
          dark={dark}
          fontFamily={fontDisplay}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
  numWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontWeight: '700',
  },
});
