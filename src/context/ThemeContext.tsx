import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'cyber' | 'default' | 'dark' | 'protective';
export type AppStyle = 'glassmorphism' | 'skeuomorphism' | 'pixel-art' | 'claymorphism';

export interface ThemeOption {
  id: AppTheme;
  style: AppStyle;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'cyber',
    style: 'glassmorphism',
    name: 'Cyber Sapphire',
    subtitle: 'Frosted Glass',
    badge: 'Glassmorphism',
    description: 'Translucent frosted glass panels with specular cyan highlights, ambient cyber glow, and multi-layered backdrop blur.',
  },
  {
    id: 'default',
    style: 'skeuomorphism',
    name: 'Titanium Console',
    subtitle: 'Analog Studio',
    badge: 'Skeuomorphism',
    description: 'Flagship analog studio console with brushed titanium plates, top specular bevels, recessed wells, and phosphor LEDs.',
  },
  {
    id: 'dark',
    style: 'pixel-art',
    name: 'OLED Midnight',
    subtitle: 'Retro Arcade',
    badge: '8-Bit Pixel',
    description: 'Stepped integer pixel borders, hard offset drop shadows, and high-contrast neon green & gold arcade telemetry.',
  },
  {
    id: 'protective',
    style: 'claymorphism',
    name: 'Amber Eye-Shield',
    subtitle: 'Puffy 3D Clay',
    badge: 'Claymorphism',
    description: 'Soft 3D inflated volume, pillowy rounded geometry, and dual inner highlights in a soothing low-blue-light amber palette.',
  },
];

const THEME_TO_STYLE_MAP: Record<AppTheme, AppStyle> = {
  cyber: 'glassmorphism',
  default: 'skeuomorphism',
  dark: 'pixel-art',
  protective: 'claymorphism',
};

interface ThemeContextType {
  theme: AppTheme;
  style: AppStyle;
  setTheme: (theme: AppTheme) => void;
  themeOptions: ThemeOption[];
  currentThemeOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'docassistant_ui_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && ['cyber', 'default', 'dark', 'protective'].includes(saved)) {
        return saved as AppTheme;
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage:', e);
    }
    return 'cyber'; // Default to Cyber Sapphire (Glassmorphism)
  });

  const currentStyle = THEME_TO_STYLE_MAP[theme] || 'glassmorphism';

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-style', currentStyle);

    if (body) {
      body.setAttribute('data-theme', theme);
      body.setAttribute('data-style', currentStyle);
      body.classList.add('dark');
    }
    root.classList.add('dark');
  }, [theme, currentStyle]);

  const currentThemeOption =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        style: currentStyle,
        setTheme,
        themeOptions: THEME_OPTIONS,
        currentThemeOption,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
