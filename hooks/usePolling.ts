'use client';

import { useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { getTranslation } from '@/hooks/useI18n';
import type { Job } from '@/types';

function sendNotification(title: string, body: string) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' });
  }
}

function autoDownloadFiles(fileUrls: string[]) {
  fileUrls.forEach((url, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(url.split('/').pop() || '');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    }, i * 400);
  });
}

function cleanupServerFiles(jobId: string) {
  fetch('/api/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId }),
  }).catch(() => {});
}

export function usePolling() {
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const {
    updateActiveJob, removeActiveJob, prependHistory,
    addToast, addDelivered, clearDelivered, setStats,
  } = useStore();

  const stopPolling = useCallback((jobId: string) => {
    const id = intervals.current.get(jobId);
    if (id !== undefined) {
      clearInterval(id);
      intervals.current.delete(jobId);
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    if (intervals.current.has(jobId)) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/progress?job_id=${encodeURIComponent(jobId)}`);
        if (!res.ok) { stopPolling(jobId); return; }
        const job: Job = await res.json();

        updateActiveJob(jobId, job);

        // Playlist live delivery
        if (job.type === 'playlist' && job.status === 'running' && Array.isArray(job.ready_files)) {
          const delivered = useStore.getState().deliveredFiles.get(jobId) || new Set<string>();
          const newFiles = job.ready_files.filter((f: string) => !delivered.has(f));
          if (newFiles.length > 0) {
            addDelivered(jobId, newFiles);
            autoDownloadFiles(newFiles);
          }
        }

        // Terminal states
        if (['completed', 'failed', 'cancelled'].includes(job.status)) {
          stopPolling(jobId);

          // If already removed (e.g. by cancel handler), skip duplicate history entry
          if (!useStore.getState().activeJobs.has(jobId)) return;

          removeActiveJob(jobId);

          // Use current language for toast messages
          const t = getTranslation;

          if (job.status === 'completed') {
            const msg = job.warning ? t('toast.doneSkipped') : t('toast.downloadComplete');
            addToast(msg, job.warning ? 'info' : 'success');
            sendNotification('Swoopt', msg);

            const alreadyDelivered = useStore.getState().deliveredFiles.get(jobId) || new Set<string>();
            const remaining = (job.file_urls ?? []).filter(f => !alreadyDelivered.has(f));

            remaining.forEach((url, i) => {
              setTimeout(() => {
                const a = document.createElement('a');
                a.href = url;
                a.download = decodeURIComponent(url.split('/').pop() || '');
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => a.remove(), 1000);
              }, i * 400);
            });

            const cleanupDelay = remaining.length * 400 + 3000;
            setTimeout(() => cleanupServerFiles(jobId), cleanupDelay);

            // Reload stats
            fetch('/api/stats').then(r => r.json()).then(data => {
              setStats(data.total_downloads, data.total_bytes);
            }).catch(() => {});
          } else if (job.status === 'failed') {
            const msg = t('toast.downloadFailed');
            addToast(msg, 'error');
            sendNotification('Swoopt', msg);
          } else {
            const msg = t('toast.cancelled');
            addToast(msg, 'info');
            sendNotification('Swoopt', msg);
          }

          clearDelivered(jobId);
          prependHistory({ ...job, file_urls: [], cleaned: true });
        }
      } catch { /* network hiccup */ }
    }, 1000);

    intervals.current.set(jobId, id);
  }, [stopPolling, updateActiveJob, removeActiveJob, addToast, addDelivered, clearDelivered, setStats, prependHistory]);

  return { startPolling, stopPolling };
}
