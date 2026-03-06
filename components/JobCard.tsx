'use client';

import { useI18n } from '@/hooks/useI18n';
import { friendlyError } from '@/lib/errors';
import type { Job } from '@/types';

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 30);
  } catch {
    return url.slice(0, 40) + '…';
  }
}

function getPhaseLabel(job: Job, t: (k: string) => string): string {
  if (job.status === 'queued')    return t('phase.queued');
  if (job.status === 'paused')    return t('phase.paused');
  if (job.status === 'completed') return t('phase.completed');
  if (job.status === 'failed')    return t('phase.failed');
  if (job.status === 'cancelled') return t('phase.cancelled');
  switch (job.phase) {
    case 'resuming':   return t('phase.resuming');
    case 'merging':    return t('phase.merging');
    case 'processing': return t('phase.processing');
    default:
      if (!job.download_speed && (job.progress ?? 0) === 0) return t('phase.processing');
      return t('phase.downloading');
  }
}

interface ActiveJobCardProps {
  job: Job;
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onCancel: (jobId: string) => void;
}

export function ActiveJobCard({ job, onPause, onResume, onCancel }: ActiveJobCardProps) {
  const { t } = useI18n();

  const label    = getPhaseLabel(job, t);
  const dotClass = job.status === 'running' ? 'status-running' : `status-${job.status ?? 'queued'}`;
  const isPaused = job.status === 'paused';
  const isRunning = job.status === 'running';

  const displayTitle = job.current_title || job.thumbnail_title || shortenUrl(job.url);

  const channel  = job.type !== 'playlist' ? (job.thumbnail_channel || '') : '';
  const duration = job.type !== 'playlist' ? (job.thumbnail_duration || '') : '';
  const metaParts = [channel, duration].filter(Boolean);

  const playlistInfo = job.type === 'playlist' && (job.total_items ?? 0) > 0
    ? t('playlist.item').replace('{current}', String(job.current_item)).replace('{total}', String(job.total_items))
    : '';

  const progressPct = Math.min(100, Math.max(0, job.progress ?? 0));
  const size  = job.downloaded_size && job.total_size ? `${job.downloaded_size} / ${job.total_size}` : '';
  const speed = (!isPaused && job.phase === 'downloading' && job.download_speed) ? job.download_speed : '';

  const progressInfoParts: string[] = [];
  if (playlistInfo) progressInfoParts.push(playlistInfo);
  if (!isPaused) {
    if (job.phase === 'resuming')   progressInfoParts.push(t('phase.resumingEllipsis'));
    else if (job.phase === 'merging')    progressInfoParts.push(t('phase.mergingEllipsis'));
    else if (job.phase === 'processing') progressInfoParts.push(t('phase.processingEllipsis'));
  }

  return (
    <div
      className="job-card job-card-active"
      id={`job-${job.id}`}
      data-job-id={job.id}
    >
      <div className="flex items-start justify-between gap-3">
        {job.thumbnail_url && (
          <div className="shrink-0 w-20 h-[52px] rounded-xs overflow-hidden bg-surface-3 max-[480px]:hidden">
            <img src={job.thumbnail_url} alt="" loading="lazy" className="card-thumb-img w-full h-full object-cover block" />
          </div>
        )}
        <div className="flex flex-col gap-[5px] min-w-0 flex-1">
          <div className="text-[0.9rem] font-medium truncate text-primary" title={job.url}>{displayTitle}</div>
          {metaParts.length > 0 && (
            <div className="text-[0.73rem] text-muted truncate">{metaParts.join(' · ')}</div>
          )}
          <div className="flex items-center gap-[7px]">
            {job.format && <span className="bg-surface-3 rounded-xs text-[0.69rem] font-bold tracking-[0.05em] px-[7px] py-[2px] uppercase text-accent">{job.format}</span>}
            {job.type   && <span className="bg-surface-3 rounded-xs text-[0.69rem] font-bold tracking-[0.05em] px-[7px] py-[2px] uppercase text-secondary">{job.type}</span>}
            <span className={`status-dot inline-flex items-center gap-[5px] text-[0.75rem] font-medium ${dotClass}`}>{label}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="bg-surface-3 rounded-full h-1.5 overflow-hidden w-full relative">
          <div className="progress-fill rounded-full h-full" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex justify-between text-[0.76rem] text-secondary">
          <span className="truncate max-w-[60%]">{progressInfoParts.join(' · ')}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="flex justify-between text-[0.73rem] text-muted min-h-[1em]">
          <span className="tabular-nums">{size}</span>
          <span className="tabular-nums">{speed}</span>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {(isRunning || isPaused) && (
          <button
            className="btn-ghost inline-flex items-center bg-surface-2 border border-edge-2 rounded-sm text-secondary cursor-pointer font-sans text-[0.76rem] font-medium gap-1.5 py-[5px] px-[11px]"
            onClick={() => isPaused ? onResume(job.id) : onPause(job.id)}
          >
            {isPaused ? t('active.resume') : t('active.pause')}
          </button>
        )}
        <button
          className="btn-danger bg-transparent border border-danger rounded-sm text-danger cursor-pointer font-sans text-[0.8rem] py-[5px] px-3"
          onClick={() => onCancel(job.id)}
        >
          {t('active.cancel')}
        </button>
      </div>
    </div>
  );
}

interface HistoryJobCardProps {
  job: Job;
  onRetry: (job: Job) => void;
  onRemove: (jobId: string) => void;
}

export function HistoryJobCard({ job, onRetry, onRemove }: HistoryJobCardProps) {
  const { t } = useI18n();

  const isCompleted = job.status === 'completed';
  const isFailed    = job.status === 'failed';

  const statusClass = isCompleted ? 'job-card-completed'
    : job.status === 'failed'    ? 'job-card-failed'
    : 'job-card-cancelled';

  const dotClass = `status-${job.status}`;
  const label    = getPhaseLabel(job, t);
  const displayTitle = job.current_title || job.thumbnail_title || shortenUrl(job.url);

  const channel  = job.type !== 'playlist' ? (job.thumbnail_channel || '') : '';
  const duration = job.type !== 'playlist' ? (job.thumbnail_duration || '') : '';
  const metaParts = [channel, duration].filter(Boolean);

  const ts = job.updated_at * 1000;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  let dateLabel = '';
  if (ts >= todayStart.getTime()) dateLabel = t('time.today');
  else if (ts >= yesterdayStart.getTime()) dateLabel = t('time.yesterday');
  else dateLabel = new Date(ts).toLocaleDateString();
  const timeLabel = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`job-card ${statusClass}`}
      data-job-id={job.id}
    >
      <div className="flex items-start justify-between gap-3">
        {job.thumbnail_url && (
          <div className="shrink-0 w-20 h-[52px] rounded-xs overflow-hidden bg-surface-3 max-[480px]:hidden min-[1024px]:w-24 min-[1024px]:h-[62px]">
            <img src={job.thumbnail_url} alt="" loading="lazy" className="card-thumb-img w-full h-full object-cover block" />
          </div>
        )}
        <div className="flex flex-col gap-[5px] min-w-0 flex-1">
          <div className="text-[0.9rem] font-medium truncate text-primary max-[480px]:max-w-[200px]" title={job.url}>{displayTitle}</div>
          {metaParts.length > 0 && (
            <div className="text-[0.73rem] text-muted truncate">{metaParts.join(' · ')}</div>
          )}
          <div className="flex items-center gap-[7px]">
            {job.format && <span className="bg-surface-3 rounded-xs text-[0.69rem] font-bold tracking-[0.05em] px-[7px] py-[2px] uppercase text-accent">{job.format}</span>}
            {job.type   && <span className="bg-surface-3 rounded-xs text-[0.69rem] font-bold tracking-[0.05em] px-[7px] py-[2px] uppercase text-secondary">{job.type}</span>}
            <span className={`status-dot inline-flex items-center gap-[5px] text-[0.75rem] font-medium ${dotClass}`}>{label}</span>
            <span className="text-[0.7rem] text-muted ml-auto whitespace-nowrap">{dateLabel} {timeLabel}</span>
          </div>
        </div>
        <button
          className="btn-delete bg-transparent border-none rounded-full text-muted cursor-pointer flex items-center justify-center w-7 h-7 shrink-0"
          title={t('history.removeFromHistory')}
          aria-label={t('history.delete')}
          onClick={() => onRemove(job.id)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {isCompleted && (
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-success text-[0.8rem] inline-flex items-center gap-[5px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {t('history.savedToDownloads')}
          </span>
        </div>
      )}
      {isFailed && (
        <>
          {job.error && (
            <div className="bg-danger-dim border border-[rgba(244,63,94,0.22)] rounded-sm text-danger text-[0.8rem] leading-[1.45] py-[9px] px-[13px] break-words">
              {friendlyError(job.error)}
            </div>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <button
              className="btn-ghost inline-flex items-center bg-surface-2 border border-edge-2 rounded-sm text-secondary cursor-pointer font-sans text-[0.76rem] font-medium gap-1.5 py-[5px] px-[11px]"
              onClick={() => onRetry(job)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
              {t('history.retry')}
            </button>
          </div>
        </>
      )}
      {!isCompleted && !isFailed && (
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-secondary text-[0.8rem]">{t('phase.cancelled')}</span>
        </div>
      )}
    </div>
  );
}
