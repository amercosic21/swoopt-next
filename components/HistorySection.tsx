'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/hooks/useI18n';
import { HistoryJobCard } from './JobCard';
import type { Job } from '@/types';

export function HistorySection() {
  const { t } = useI18n();
  const { historyJobs, removeHistory, addToast, addActiveJob } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  if (historyJobs.length === 0) return null;

  const handleRemove = async (jobId: string) => {
    try {
      await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      removeHistory(jobId);
      addToast(t('toast.downloadRemoved'), 'info');
    } catch { /* ignore */ }
  };

  const handleRetry = async (job: Job) => {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: job.url, format: job.format, type: job.type }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error || t('form.unknownError'), 'error'); return; }

      const newJob: Job = {
        ...job,
        id: data.job_id,
        status: data.status || 'queued',
        progress: 0,
        error: null,
        pid: null,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };
      addActiveJob(data.job_id, newJob);
      addToast(t('toast.downloadStarted'), 'success');
    } catch {
      addToast(t('form.serverError'), 'error');
    }
  };

  const handleClearAll = async () => {
    const jobs = [...historyJobs];
    await Promise.all(jobs.map(job =>
      fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      }).catch(() => {})
    ));
    jobs.forEach(job => removeHistory(job.id));
  };

  return (
    <section className="flex flex-col gap-3 animate-section-reveal" id="historySection">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="flex items-center gap-[9px] text-[0.78rem] font-semibold uppercase tracking-[0.09em] text-secondary select-none">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-muted"></span>
          {t('history.title')}
        </h2>
        <div className="flex items-center gap-1.5 max-[480px]:gap-1">
          <button
            className="btn-ghost inline-flex items-center bg-surface-2 border border-edge-2 rounded-sm text-secondary cursor-pointer font-sans text-[0.83rem] font-medium gap-1.5 py-[7px] px-[13px] !py-[5px] !px-[11px] !text-[0.76rem]"
            id="collapseHistoryBtn"
            onClick={() => setCollapsed(c => !c)}
          >
            <svg
              className="transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              width={12}
              height={12}
              style={{ transform: collapsed ? 'rotate(180deg)' : undefined }}
            >
              <polyline points="18 15 12 9 6 15"/>
            </svg>
            {collapsed ? t('history.expand') : t('history.collapse')}
          </button>
          <button className="btn-ghost inline-flex items-center bg-surface-2 border border-edge-2 rounded-sm text-secondary cursor-pointer font-sans text-[0.83rem] font-medium gap-1.5 py-[7px] px-[13px] !py-[5px] !px-[11px] !text-[0.76rem] btn-destructive text-muted" onClick={handleClearAll}>
            {t('history.clearAll')}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="gap-2.5" id="historyJobs">
          {historyJobs.map(job => (
            <HistoryJobCard
              key={job.id}
              job={job}
              onRetry={handleRetry}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
