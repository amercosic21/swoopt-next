'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/hooks/useI18n';
import type { AppSettings } from '@/types';

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

export function SettingsPanel({ visible, onClose }: SettingsPanelProps) {
  const { t } = useI18n();

  const [rateLimit, setRateLimit] = useState('');
  const [cookiesBrowser, setCookiesBrowser] = useState('');
  const [subtitles, setSubtitles] = useState(false);
  const [embedMetadata, setEmbedMetadata] = useState(false);
  const [embedThumbnail, setEmbedThumbnail] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [status, setStatus] = useState('');
  const [updateLabel, setUpdateLabel] = useState('');

  const loadSettings = useCallback(async () => {
    // Reduce motion from localStorage
    setReduceMotion(localStorage.getItem('sw_reduce_motion') === '1');

    try {
      const res = await fetch('/api/settings');
      const data: AppSettings = await res.json();
      setRateLimit(data.rate_limit || '');
      setCookiesBrowser(data.cookies_browser || '');
      setSubtitles(!!data.subtitles);
      setEmbedMetadata(!!data.embed_metadata);
      setEmbedThumbnail(!!data.embed_thumbnail);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (visible) {
      loadSettings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [visible, loadSettings]);

  const handleReduceMotion = (checked: boolean) => {
    setReduceMotion(checked);
    document.body.classList.toggle('reduced-motion', checked);
    localStorage.setItem('sw_reduce_motion', checked ? '1' : '0');
  };

  const saveSettings = async () => {
    setStatus(t('settings.saving'));
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate_limit: rateLimit,
          cookies_browser: cookiesBrowser,
          subtitles,
          embed_metadata: embedMetadata,
          embed_thumbnail: embedThumbnail,
        }),
      });
      if (res.ok) {
        setStatus(t('settings.saved'));
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus(t('settings.errorSaving'));
      }
    } catch {
      setStatus(t('settings.networkError'));
    }
  };

  const updateYtdlp = async () => {
    setUpdateLabel(t('settings.updating'));
    try {
      const res = await fetch('/api/update-ytdlp', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'updated') setUpdateLabel(t('toast.engineUpdated'));
      else if (data.status === 'up_to_date') setUpdateLabel(t('toast.engineUpToDate'));
      else setUpdateLabel(t('toast.updateFailed'));
      setTimeout(() => setUpdateLabel(''), 3000);
    } catch {
      setUpdateLabel(t('toast.updateFailed'));
      setTimeout(() => setUpdateLabel(''), 3000);
    }
  };

  if (!visible) return null;

  return (
    <section className="settings-panel bg-surface border border-edge rounded p-6 flex flex-col gap-5 animate-card-in min-[1200px]:p-7 min-[1920px]:p-9">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[0.9rem] font-semibold text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          {t('settings.title')}
        </h2>
        <button
          className="btn-icon"
          onClick={onClose}
          aria-label={t('settings.close')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 py-3.5 border-b border-edge">
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.82rem] font-semibold text-primary">{t('settings.speedLimit')}</span>
            <span className="text-[0.72rem] text-muted leading-[1.4]">{t('settings.speedLimit.desc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input-field w-full flex-1 py-2 px-3 text-[0.82rem] bg-surface-2 border border-edge rounded-sm text-primary font-sans outline-none cursor-pointer appearance-auto"
              value={rateLimit}
              onChange={e => setRateLimit(e.target.value)}
            >
              <option value="">{t('settings.unlimited')}</option>
              <option value="500K">0.5 MB/s</option>
              <option value="1M">1 MB/s</option>
              <option value="2M">2 MB/s</option>
              <option value="5M">5 MB/s</option>
              <option value="10M">10 MB/s</option>
              <option value="20M">20 MB/s</option>
              <option value="50M">50 MB/s</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-3.5 border-b border-edge">
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.82rem] font-semibold text-primary">{t('settings.browserCookies')}</span>
            <span className="text-[0.72rem] text-muted leading-[1.4]">{t('settings.browserCookies.desc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input-field w-full flex-1 py-2 px-3 text-[0.82rem] bg-surface-2 border border-edge rounded-sm text-primary font-sans outline-none cursor-pointer appearance-auto"
              value={cookiesBrowser}
              onChange={e => setCookiesBrowser(e.target.value)}
            >
              <option value="">{t('settings.disabled')}</option>
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="edge">Edge</option>
              <option value="opera">Opera</option>
              <option value="brave">Brave</option>
              <option value="vivaldi">Vivaldi</option>
              <option value="safari">Safari</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 py-2 max-[480px]:flex-col">
          <label className="setting-toggle flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={subtitles} onChange={e => setSubtitles(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="text-[0.8rem] font-medium text-secondary">{t('settings.downloadCaptions')}</span>
          </label>
          <label className="setting-toggle flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={embedMetadata} onChange={e => setEmbedMetadata(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="text-[0.8rem] font-medium text-secondary">{t('settings.embedMetadata')}</span>
          </label>
          <label className="setting-toggle flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={embedThumbnail} onChange={e => setEmbedThumbnail(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="text-[0.8rem] font-medium text-secondary">{t('settings.embedThumbnail')}</span>
          </label>
          <label className="setting-toggle flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={reduceMotion} onChange={e => handleReduceMotion(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="text-[0.8rem] font-medium text-secondary">{t('settings.reduceAnimations')}</span>
          </label>
        </div>

        {isLocalhost && (
          <div className="flex flex-row items-center justify-between gap-4 py-3.5 border-b border-edge max-[700px]:flex-col max-[700px]:items-stretch">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.82rem] font-semibold text-primary">{t('settings.downloadEngine')}</span>
              <span className="text-[0.72rem] text-muted leading-[1.4]">{t('settings.downloadEngine.desc')}</span>
            </div>
            <button
              className="btn-ghost inline-flex items-center bg-surface-2 border border-edge-2 rounded-sm text-secondary cursor-pointer font-sans text-[0.76rem] font-medium gap-1.5 py-[5px] px-[11px]"
              onClick={updateYtdlp}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
              {updateLabel || t('settings.checkUpdates')}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          className="btn-primary border-none rounded-sm text-white cursor-pointer inline-flex items-center font-sans text-[0.76rem] font-semibold gap-1.5 py-[5px] px-[11px] whitespace-nowrap"
          onClick={saveSettings}
        >
          {t('settings.save')}
        </button>
        <span className="text-[0.78rem] text-success">{status}</span>
      </div>
    </section>
  );
}
