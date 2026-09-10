import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Level } from '../logic/types';
import { LEVELS } from '../services/levels';
import { useSettingsStore } from '../state/settingsStore';
import { AdBanner } from '../ui/AdBanner';
import { GameButton } from '../ui/GameButton';
import { JourneyPath } from '../ui/JourneyPath';
import { ScreenBackground } from '../ui/ScreenBackground';
import { useAppTheme, useThemeTokens } from '../ui/ThemeProvider';

export default function LevelSelectScreen() {
  const router = useRouter();
  const scheme = useAppTheme();
  const { bgTop, fontDisplay } = useThemeTokens();
  const dark = scheme === 'dark';
  const completedIds = useSettingsStore((s) => s.completedIds);

  const openLevel = (level: Level) => {
    router.push({ pathname: '/level/[id]', params: { id: level.id } });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgTop }]} edges={['top', 'bottom']}>
      <ScreenBackground />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: dark ? '#ECE7DB' : '#2E2C28', fontFamily: fontDisplay }]}>
            Niveaux
          </Text>
          <GameButton
            title="Réglages"
            small
            variant="secondary"
            onPress={() => router.push('/settings')}
            accessibilityLabel="Ouvrir les réglages"
          />
        </View>
        <Text style={[styles.subtitle, { color: dark ? '#8E8878' : '#8A867C' }]}>
          {completedIds.length} niveau{completedIds.length > 1 ? 'x' : ''} terminé
          {completedIds.length > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.path}>
        <JourneyPath levels={LEVELS} completedIds={completedIds} onSelect={openLevel} />
      </View>
      {/* Bannière AdMob : sélection uniquement, jamais pendant un plateau. */}
      <View style={styles.banner}>
        <AdBanner />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  path: {
    flex: 1,
  },
  banner: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
