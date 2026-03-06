'use client';

import { useStore } from '@/store/useStore';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  onSettingsToggle: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function Header({ onSettingsToggle }: HeaderProps) {
  const { t, lang, setLang, availableLangs } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { statsCount, statsSize } = useStore();

  const isDark = theme === 'dark';

  const cycleLanguage = () => {
    const idx = availableLangs.indexOf(lang);
    setLang(availableLangs[(idx + 1) % availableLangs.length]);
  };

  const statsLabel = statsCount === 1 ? t('stats.file', { count: statsCount }) : t('stats.files', { count: statsCount });

  return (
    <header className="glass-header sticky top-0 z-20 w-full border-b border-edge">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-[60px]">
        <div className="flex items-center gap-2.5 text-[1.12rem] font-bold tracking-tight text-primary">
          <img className="w-[26px] h-[26px] rounded-xs animate-logo-enter" src="/favicon.svg" alt="Swoopt" width={26} height={26} />
          Swoopt
        </div>
        <div className="flex items-center gap-2">
          <div className="stats-badge flex max-[700px]:hidden items-center gap-[5px] text-[0.72rem] font-medium text-muted py-[5px] px-2.5 border border-edge rounded-sm whitespace-nowrap relative overflow-hidden" id="statsBadge" title="Download statistics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <span id="statsCount">{statsLabel}</span>
            <span className="opacity-40">&middot;</span>
            <span id="statsSize">{formatBytes(statsSize)}</span>
          </div>

          <button
            className="btn-icon"
            id="langToggle"
            aria-label={t('lang.label')}
            title={t('lang.label')}
            onClick={cycleLanguage}
          >
            <span className="text-[0.68rem] font-bold tracking-[0.04em] uppercase">{lang.toUpperCase()}</span>
          </button>

          <button
            className="btn-icon"
            id="themeToggle"
            aria-label={t('theme.toggle')}
            title={t('theme.toggle')}
            onClick={toggleTheme}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={17} height={17}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={17} height={17}>
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>

          <button
            className="btn-icon"
            id="settingsToggle"
            aria-label={t('settings.label')}
            title={t('settings.label')}
            onClick={onSettingsToggle}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={17} height={17}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
