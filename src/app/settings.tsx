import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore, type ThemeMode } from '../state/settingsStore';
import { GameButton } from '../ui/GameButton';
import { ScreenBackground } from '../ui/ScreenBackground';
import { useAppTheme, useThemeTokens } from '../ui/ThemeProvider';

const THEME_CHOICES: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'system', label: 'Système' },
  { mode: 'light', label: 'Clair' },
  { mode: 'dark', label: 'Sombre' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useAppTheme();
  const { bgTop, fontDisplay } = useThemeTokens();
  const dark = scheme === 'dark';
  const s = useSettingsStore();

  const row = { borderColor: dark ? '#3A372E' : '#D9D3C3' };
  const ink = { color: dark ? '#ECE7DB' : '#2E2C28' };
  const muted = { color: dark ? '#8E8878' : '#8A867C' };
  const pill = (active: boolean) => ({
    borderColor: active ? (dark ? '#8FB5A3' : '#4F7A6A') : dark ? '#3A372E' : '#D9D3C3',
    backgroundColor: active ? (dark ? '#24332D' : '#E4EBE2') : 'transparent',
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgTop }]} edges={['top', 'bottom']}>
      <ScreenBackground />
      <View style={styles.header}>
        <Text style={[styles.title, ink, { fontFamily: fontDisplay }]}>Réglages</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.section, muted]}>Thème</Text>
        <View style={[styles.card, row]}>
          {THEME_CHOICES.map((c) => (
            <Pressable
              key={c.mode}
              onPress={() => s.setTheme(c.mode)}
              accessibilityRole="button"
              accessibilityLabel={`Thème ${c.label}`}
              accessibilityState={{ selected: s.theme === c.mode }}
              style={[styles.pill, pill(s.theme === c.mode)]}>
              <Text
                style={[
                  styles.pillText,
                  { color: s.theme === c.mode ? (dark ? '#A9CBBD' : '#3E6355') : muted.color },
                ]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, muted]}>Retours</Text>
        <View style={[styles.card, row]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, ink]}>Son</Text>
            <Switch value={s.sound} onValueChange={s.setSound} />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, ink]}>Musique</Text>
            <Switch value={s.music} onValueChange={s.setMusic} />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, ink]}>Vibration</Text>
            <Switch value={s.vibration} onValueChange={s.setVibration} />
          </View>
        </View>

        <Text style={[styles.section, muted]}>Progression</Text>
        <View style={[styles.card, row]}>
          <Text style={[styles.toggleLabel, ink]}>
            {s.completedIds.length} niveau{s.completedIds.length > 1 ? 'x' : ''} terminé
            {s.completedIds.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <GameButton
          title="Retour"
          variant="secondary"
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        />
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  section: {
    fontSize: 13,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#8A867C33',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
});
