import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Level } from '../logic/types';
import { LEVELS } from '../services/levels';
import { useSettingsStore } from '../state/settingsStore';
import { AdBanner } from '../ui/AdBanner';
import { JourneyPath } from '../ui/JourneyPath';
import { ScreenBackground } from '../ui/ScreenBackground';
import { useAppTheme, useThemeTokens } from '../ui/ThemeProvider';

export default function LevelSelectScreen() {
  const router = useRouter();
  const scheme = useAppTheme();
  const { bgTop } = useThemeTokens();
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
          <Text style={[styles.title, { color: dark ? '#ECE7DB' : '#2E2C28' }]}>Niveaux</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les réglages"
            style={[styles.gear, { borderColor: dark ? '#8FB5A3' : '#4F7A6A' }]}>
            <Text style={[styles.gearText, { color: dark ? '#A9CBBD' : '#3E6355' }]}>
              Réglages
            </Text>
          </Pressable>
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
  gear: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearText: {
    fontSize: 14,
    fontWeight: '600',
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
