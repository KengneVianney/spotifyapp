import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  card: string;
};

const darkColors: ThemeColors = {
  background: '#0A0A12',
  surface: '#1a1a2e',
  surfaceLight: 'rgba(255,255,255,0.06)',
  text: '#fff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#1DB954',
  card: 'rgba(30, 30, 50, 0.92)',
};

const lightColors: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: 'rgba(0,0,0,0.04)',
  text: '#1A1A1A',
  textSecondary: 'rgba(0,0,0,0.55)',
  textMuted: 'rgba(0,0,0,0.35)',
  border: 'rgba(0,0,0,0.08)',
  accent: '#1DB954',
  card: '#FFFFFF',
};

type ThemeContextType = {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true, colors: darkColors, toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme !== 'light');
  const toggleTheme = () => setIsDark(prev => !prev);
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);
  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
