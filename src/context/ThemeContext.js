import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import StorageService from '../utils/StorageService';

// Light theme colors
const LIGHT_COLORS = {
  background: '#FFF9F0',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  border: '#F0F0F0',
  divider: '#F0F0F0',
  inputBackground: '#F0F0F0',
  primary: '#FF6B6B',
  accent: '#4ECDC4',
  tabBarBackground: '#FFF9F0',
  tabBarInactive: '#B2BEC3',
  modalOverlay: 'rgba(0,0,0,0.5)',
  statusBar: 'dark-content',
};

// Dark theme colors
const DARK_COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#808080',
  border: '#333333',
  divider: '#333333',
  inputBackground: '#2A2A2A',
  primary: '#FF6B6B',
  accent: '#4ECDC4',
  tabBarBackground: '#1E1E1E',
  tabBarInactive: '#666666',
  modalOverlay: 'rgba(0,0,0,0.7)',
  statusBar: 'light-content',
};

// Export color constants
export const lightColors = LIGHT_COLORS;
export const darkColors = DARK_COLORS;

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  console.log('[ThemeProvider] Rendering ThemeProvider');
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('dark'); // 'light', 'dark', 'auto'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await StorageService.getItem('themeMode');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  const updateThemeMode = async (mode) => {
    setThemeMode(mode);
    try {
      await StorageService.setItem('themeMode', mode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  // Determine if dark mode should be active
  const isDarkMode = themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');

  // Get current colors based on theme
  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  const value = {
    themeMode,
    setThemeMode: updateThemeMode,
    isDarkMode,
    colors,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  console.log('[useAppTheme] context:', context);
  console.log('[useAppTheme] context?.colors:', context?.colors);
  // Return default light theme values if context is not available or colors is undefined
  if (!context || !context?.colors) {
    console.log('[useAppTheme] Returning default LIGHT_COLORS fallback');
    return {
      themeMode: 'light',
      setThemeMode: () => {},
      isDarkMode: false,
      colors: LIGHT_COLORS,
      isLoading: true,
    };
  }
  console.log('[useAppTheme] Returning context with colors:', context.colors);
  return context;
};

export default ThemeContext;
