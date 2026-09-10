// Placeholder d'écran de jeu : aucune mécanique, juste la navigation.
// Le plateau (GridCanvas + geste) arrive à la phase suivante.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { remainingTiles } from '../../logic/gameplay-rules';
import { getHintForHead } from '../../logic/hint';
import { maybeShowInterstitial, showRewardedForHint } from '../../services/ads';
import { logHintUsed, logLevelComplete, logLevelStart } from '../../services/analytics';
import { LEVELS, levelById } from '../../services/levels';
import { useGameStore } from '../../state/gameStore';
import { useSettingsStore } from '../../state/settingsStore';
import { GameButton } from '../../ui/GameButton';
import { GridCanvas } from '../../ui/GridCanvas';
import { ScreenBackground } from '../../ui/ScreenBackground';
import { useAppTheme, useThemeTokens } from '../../ui/ThemeProvider';
import { TileCounter } from '../../ui/TileCounter';

/** Indice gratuit : 1 seul pas de la 1re tête incomplète (overlay, sans pub). */
function showFreeHint(levelId: string): void {
  const level = levelById(levelId);
  const { paths } = useGameStore.getState();
  if (!level) return;
  for (const head of level.heads) {
    const hint = getHintForHead(level, paths, head.id);
    if (hint) {
      useGameStore.getState().revealHint(head.id, [hint]);
      useSettingsStore.getState().useHint(levelId);
      logHintUsed(levelId);
      return;
    }
  }
}

export default function LevelPlaceholderScreen() {
  const router = useRouter();
  const scheme = useAppTheme();
  const { bgTop, fontDisplay } = useThemeTokens();
  const dark = scheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();

  const level = typeof id === 'string' ? levelById(id) : undefined;
  const index = typeof id === 'string' ? LEVELS.findIndex((l) => l.id === id) : -1;
  const solved = useGameStore((s) => s.solved);
  const reset = useGameStore((s) => s.reset);
  // Dérivé de paths : change à chaque extend()/reelBackTo(), jamais stocké.
  const remaining = useGameStore((s) =>
    s.level ? remainingTiles(s.level, s.paths) : 0,
  );
  // Dimensions RÉELLES de la zone plateau (header + boutons exclus) : le plateau
  // est dimensionné pour y tenir, jamais l'inverse.
  const [boardSpace, setBoardSpace] = useState<{ w: number; h: number } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const solvedFired = useRef(false);

  useEffect(() => {
    if (level) {
      solvedFired.current = false;
      useGameStore.getState().loadLevel(level);
      logLevelStart(level.id);
    }
  }, [id, level]);

  // Résolution : event analytics + interstitielle plafonnée (1/4 max).
  useEffect(() => {
    if (solved && level && !solvedFired.current) {
      solvedFired.current = true;
      logLevelComplete(level.id, useGameStore.getState().moves);
      void maybeShowInterstitial(level.id);
    }
  }, [solved, level]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgTop }]} edges={['top', 'bottom']}>
      <ScreenBackground />
      {level && index >= 0 ? (
        <>
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: dark ? '#ECE7DB' : '#2E2C28', fontFamily: fontDisplay }]}>
              Niveau {index + 1}
            </Text>
            <Text style={[styles.meta, { color: dark ? '#8E8878' : '#8A867C' }]}>
              {level.width}×{level.height} · {level.heads.length} chemins ·{' '}
              {level.crates.length} obstacle{level.crates.length > 1 ? 's' : ''}
            </Text>
            {solved && (
              <Text style={[styles.solved, { color: dark ? '#A9CBBD' : '#3E6355' }]}>
                Niveau résolu !
              </Text>
            )}
            {!solved && (
              <View style={styles.counter}>
                <TileCounter remaining={remaining} />
              </View>
            )}
            {!solved && (
              <View style={styles.hintRow}>
                <GameButton
                  title="Indice"
                  small
                  variant="secondary"
                  onPress={() => {
                    if (level) showFreeHint(level.id);
                  }}
                  accessibilityLabel="Révéler le prochain pas"
                />
                <GameButton
                  title={hintLoading ? 'Chargement…' : 'Indice (pub)'}
                  small
                  variant="primary"
                  disabled={hintLoading}
                  onPress={() => {
                    if (!level || hintLoading) return;
                    setHintLoading(true);
                    void showRewardedForHint(level.id).finally(() => setHintLoading(false));
                  }}
                  accessibilityLabel="Regarder une publicité pour révéler le chemin restant"
                />
              </View>
            )}
          </View>
          <View
            style={styles.boardZone}
            onLayout={(e) =>
              setBoardSpace({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
            }>
            {boardSpace && (
              <GridCanvas level={level} maxWidth={boardSpace.w} maxHeight={boardSpace.h} />
            )}
          </View>
          <View style={styles.buttons}>
            <GameButton
              title="Recommencer"
              variant="primary"
              onPress={reset}
              accessibilityLabel="Recommencer le niveau"
            />
            <GameButton
              title="Retour"
              variant="secondary"
              onPress={() => router.back()}
              accessibilityLabel="Retour à la sélection"
            />
          </View>
        </>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.title, { color: dark ? '#ECE7DB' : '#2E2C28' }]}>
            Niveau introuvable
          </Text>
          <View style={styles.notFoundBack}>
            <GameButton
              title="Retour"
              variant="secondary"
              onPress={() => router.back()}
              accessibilityLabel="Retour à la sélection"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  meta: {
    marginTop: 8,
    fontSize: 15,
  },
  // La zone plateau prend tout l'espace restant et centre le plateau :
  // le plateau s'y inscrit (via maxWidth/maxHeight mesurés), les boutons
  // restent en flux normal en dessous, sans jamais le recouvrir.
  boardZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  hintRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  solved: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  counter: {
    marginTop: 6,
  },
  note: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  notFoundBack: {
    marginTop: 28,
  },
});
