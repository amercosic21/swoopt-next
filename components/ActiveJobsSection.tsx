'use client';

import { useStore } from '@/store/useStore';
import { useI18n } from '@/hooks/useI18n';
import { ActiveJobCard } from './JobCard';

export function ActiveJobsSection() {
  const { t } = useI18n();
  const { activeJobs, updateActiveJob, removeActiveJob, prependHistory, addToast } = useStore();

  const jobs = Array.from(activeJobs.values());

  const handlePause = async (jobId: string) => {
    updateActiveJob(jobId, { phase: 'paused' });
    try {
      const res = await fetch('/api/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (!res.ok) {
        addToast(t('toast.couldNotPause'), 'error');
        updateActiveJob(jobId, { phase: 'downloading' });
      } else {
        updateActiveJob(jobId, { status: 'paused' });
        addToast(t('toast.downloadPaused'), 'info');
      }
    } catch {
      addToast(t('toast.couldNotPause'), 'error');
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (!res.ok) {
        addToast(t('toast.couldNotResume'), 'error');
      } else {
        updateActiveJob(jobId, { status: 'running', phase: 'resuming' });
        addToast(t('toast.downloadResumed'), 'info');
      }
    } catch {
      addToast(t('toast.couldNotResume'), 'error');
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (!res.ok) {
        addToast(t('toast.couldNotCancel'), 'error');
      } else {
        const job = activeJobs.get(jobId);
        removeActiveJob(jobId);
        if (job) {
          prependHistory({ ...job, status: 'cancelled', file_urls: [], cleaned: true });
        }
        addToast(t('toast.downloadCancelled'), 'info');
      }
    } catch {
      addToast(t('toast.couldNotCancel'), 'error');
    }
  };

  if (jobs.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 animate-section-reveal" id="activeSection">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="flex items-center gap-[9px] text-[0.78rem] font-semibold uppercase tracking-[0.09em] text-secondary select-none">
          <span className="dot-warning w-[7px] h-[7px] rounded-full shrink-0 bg-warning"></span>
          {t('active.title')}
        </h2>
      </div>
      <div className="flex flex-col gap-2.5" id="activeJobs">
        {jobs.map(job => (
          <ActiveJobCard
            key={job.id}
            job={job}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
        ))}
      </div>
    </section>
  );
}
