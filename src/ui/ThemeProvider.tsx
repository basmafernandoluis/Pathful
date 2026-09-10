// Thème effectif : le réglage sauvegardé prime, 'system' suit l'OS.
// Les écrans utilisent useAppTheme() au lieu de useColorScheme() directement
// pour que le choix Clair/Sombre de l'écran réglages s'applique partout.
// Identité Pathful : fond en dégradé subtil + grain, jamais de noir plat.
import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../state/settingsStore';

export type ThemeTokens = {
  scheme: 'light' | 'dark';
  /** Dégradé de fond : haut → bas (ScreenBackground). */
  bgTop: string;
  bgBottom: string;
  /** Opacité du grain (ScreenBackground). */
  grainOpacity: number;
};

const TOKENS: Record<'light' | 'dark', Omit<ThemeTokens, 'scheme'>> = {
  light: {
    bgTop: '#F7F4EC',
    bgBottom: '#E7DFCC',
    grainOpacity: 0.05,
  },
  dark: {
    bgTop: '#232B36',
    bgBottom: '#0B1114',
    grainOpacity: 0.04,
  },
};

/** Couleur haute du fond pour un thème donné (voile ThemeFade). */
export function bgTopFor(scheme: 'light' | 'dark'): string {
  return TOKENS[scheme].bgTop;
}

const ThemeCtx = createContext<'light' | 'dark'>('light');

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const effective = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return <ThemeCtx.Provider value={effective}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme(): 'light' | 'dark' {
  return useContext(ThemeCtx);
}

/** Tokens visuels du thème courant (fond, grain, puis typo/boutons). */
export function useThemeTokens(): ThemeTokens {
  const scheme = useAppTheme();
  return { scheme, ...TOKENS[scheme] };
}
