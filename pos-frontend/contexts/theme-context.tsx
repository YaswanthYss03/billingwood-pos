'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();

  // Apply theme to DOM
  const applyTheme = useCallback((darkMode: boolean) => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
  }, []);

  // Load theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Always start with localStorage/system preference
        const savedTheme = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialDarkMode = savedTheme !== null ? savedTheme === 'true' : prefersDark;
        
        applyTheme(initialDarkMode);
        setIsDarkMode(initialDarkMode);
        setMounted(true);

        // Only try to load from API if user is authenticated
        if (user) {
          try {
            const response = await api.tenants.getSettings();
            const darkModeFromAPI = response.data.settings.darkMode || false;
            
            // Update if API value is different
            if (darkModeFromAPI !== initialDarkMode) {
              applyTheme(darkModeFromAPI);
              setIsDarkMode(darkModeFromAPI);
            }
          } catch (error) {
            // Silently fail - user preference already loaded from localStorage
          }
        }
      } catch (error) {
        // Fallback to system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark);
        setIsDarkMode(prefersDark);
        setMounted(true);
      }
    };

    initializeTheme();
  }, [applyTheme, user]);

  // Save theme when it changes (only if authenticated)
  const saveThemeToDatabase = useCallback(async (darkMode: boolean) => {
    if (!user) return; // Don't try to save if not authenticated
    
    try {
      const response = await api.tenants.getSettings();
      const currentSettings = response.data.settings;
      
      await api.tenants.updateSettings({
        ...currentSettings,
        darkMode: darkMode,
      });
    } catch (error) {
      // Silently fail - localStorage is already updated
    }
  }, [user]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Apply theme when isDarkMode changes
  useEffect(() => {
    if (mounted) {
      applyTheme(isDarkMode);
      saveThemeToDatabase(isDarkMode);
    }
  }, [isDarkMode, mounted, applyTheme, saveThemeToDatabase]);

  const setDarkMode = useCallback((value: boolean) => {
    setIsDarkMode(value);
    applyTheme(value);
    saveThemeToDatabase(value);
  }, [applyTheme, saveThemeToDatabase]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
