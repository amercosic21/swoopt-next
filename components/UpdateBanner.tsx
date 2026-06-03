'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useStore } from '@/store/useStore';
import { postJson } from '@/utils/http';

const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

/**
 * Shows a dismissible banner when a newer yt-dlp version is available, with a
 * "Click to update" action that updates the binary in place (no app restart -
 * the next download picks up the new version automatically). Localhost only.
 */
export function UpdateBanner() {
  const { t } = useI18n();
  const { addToast } = useStore();
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isLocalhost) return;
    fetch('/api/check-update')
      .then(r => r.json())
      .then(data => { if (data.updateAvailable && data.latest) setLatest(data.latest); })
      .catch(() => {});
  }, []);

  if (!isLocalhost || dismissed || !latest) return null;

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const { data } = await postJson<{ status?: string }>('/api/update-ytdlp', {});
      if (data.status === 'updated') {
        addToast(t('toast.engineUpdated'), 'success');
        setDismissed(true);
      } else if (data.status === 'up_to_date') {
        addToast(t('toast.engineUpToDate'), 'info');
        setDismissed(true);
      } else {
        addToast(t('toast.updateFailed'), 'error');
      }
    } catch {
      addToast(t('toast.updateFailed'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-surface border border-edge border-l-3 border-l-accent rounded p-3 px-4 animate-card-in">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} className="text-accent shrink-0">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
      </svg>
      <span className="text-[0.83rem] text-primary flex-1 min-w-0">{t('update.bannerText', { latest })}</span>
      <button
        className="btn-primary border-none rounded-sm text-white cursor-pointer inline-flex items-center font-sans text-[0.76rem] font-semibold gap-1.5 py-[5px] px-[11px] whitespace-nowrap"
        onClick={handleUpdate}
        disabled={updating}
      >
        {updating ? t('settings.updating') : t('update.action')}
      </button>
      <button
        className="btn-icon w-[26px] h-[26px] border-none shrink-0"
        onClick={() => setDismissed(true)}
        aria-label={t('update.dismiss')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
