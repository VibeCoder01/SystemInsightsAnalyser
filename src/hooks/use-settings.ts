"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/lib/types';

const SETTINGS_KEY = 'system-insights-analyzer-settings';

const defaultSettings: Settings = {
  disappearanceThresholdDays: 90,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Failed to load settings from local storage", error);
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prevSettings => {
      const updated = { ...prevSettings, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save settings to local storage", error);
      }
      return updated;
    });
  }, []);

  return { settings, updateSettings, isLoaded };
}
