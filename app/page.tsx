'use client';

import { useEffect, useState } from 'react';
import { I18nContext, useI18nProvider } from '@/hooks/useI18n';
import { useStore, getSavedActiveJobs } from '@/store/useStore';
import { usePolling } from '@/hooks/usePolling';
import { Header } from '@/components/Header';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ThumbnailPreview } from '@/components/ThumbnailPreview';
import { DownloadForm } from '@/components/DownloadForm';
import { ActiveJobsSection } from '@/components/ActiveJobsSection';
import { HistorySection } from '@/components/HistorySection';
import { ToastContainer } from '@/components/Toast';
import type { Job } from '@/types';

export default function Home() {
  const i18n = useI18nProvider();
  const { setHistoryJobs, setStats, setFormat, setQuality, addActiveJob, removeActiveJob, prependHistory, addToast, addDelivered } = useStore();
  const { startPolling } = usePolling();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply saved theme, reduced-motion, and format/quality before first paint
  useEffect(() => {
    const theme = localStorage.getItem('sw_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    if (localStorage.getItem('sw_reduce_motion') === '1') {
      document.body.classList.add('reduced-motion');
    }

    // Hydrate saved format/quality from localStorage (deferred to avoid SSR mismatch)
    const savedFormat = localStorage.getItem('sw_format');
    const savedQuality = localStorage.getItem('sw_quality');
    if (savedFormat) setFormat(savedFormat);
    if (savedQuality) setQuality(savedQuality);
  }, []);

  // Load history on mount
  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.jobs)) setHistoryJobs(data.jobs); })
      .catch(() => {});
  }, [setHistoryJobs]);

  // Load stats on mount
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data.total_downloads || 0, data.total_bytes || 0))
      .catch(() => {});
  }, [setStats]);

  // Request notification permission
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Restore active jobs from localStorage on mount
  useEffect(() => {
    const savedIds = getSavedActiveJobs();
    if (savedIds.length === 0) return;

    (async () => {
      for (const jobId of savedIds) {
        try {
          const res = await fetch(`/api/progress?job_id=${encodeURIComponent(jobId)}`);
          if (!res.ok) { continue; }
          const job: Job = await res.json();

          if (['completed', 'failed', 'cancelled'].includes(job.status)) {
            if (job.status === 'completed') {
              addToast(job.warning ? i18n.t('toast.doneSkipped') : i18n.t('toast.downloadComplete'), job.warning ? 'info' : 'success');
              fetch('/api/stats').then(r => r.json()).then(data => {
                setStats(data.total_downloads || 0, data.total_bytes || 0);
              }).catch(() => {});
            }
            prependHistory({ ...job, file_urls: [], cleaned: true });
            continue;
          }

          // Seed already-existing ready_files so they don't get re-downloaded
          if (job.type === 'playlist' && Array.isArray(job.ready_files) && job.ready_files.length > 0) {
            addDelivered(jobId, job.ready_files);
          }

          addActiveJob(jobId, job);
          startPolling(jobId);
        } catch { /* skip */ }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel active downloads on tab close (sendBeacon)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const ids = getSavedActiveJobs();
      for (const jobId of ids) {
        navigator.sendBeacon('/api/cancel', new Blob([JSON.stringify({ job_id: jobId })], { type: 'application/json' }));
      }
      localStorage.removeItem('sw_active_jobs');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <I18nContext.Provider value={i18n}>
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>
      <div className="bg-grid" aria-hidden="true"></div>

      <Header onSettingsToggle={() => setSettingsOpen(o => !o)} />

      <div className="app">
        <main className="main">
          <SettingsPanel visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <ThumbnailPreview />
          <DownloadForm />
          <ActiveJobsSection />
          <HistorySection />
        </main>
      </div>

      <ToastContainer />
    </I18nContext.Provider>
  );
}
