'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('sw_theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setThemeState(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sw_theme', next);
      document.body.classList.add('theme-transition');
      document.documentElement.setAttribute('data-theme', next);
      setTimeout(() => document.body.classList.remove('theme-transition'), 450);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
