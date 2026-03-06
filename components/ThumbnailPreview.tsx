'use client';

import { useI18n } from '@/hooks/useI18n';
import { useStore } from '@/store/useStore';

export function ThumbnailPreview() {
  const { t } = useI18n();
  const { thumbnailData, setThumbnailData } = useStore();

  if (!thumbnailData) return null;

  const { title, thumbnail, channel, duration } = thumbnailData;

  const formatDuration = (secs: number) => {
    if (!secs) return '';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  const durationStr = typeof duration === 'number' ? formatDuration(duration) : duration;

  return (
    <div className="flex items-center gap-3.5 bg-surface border border-edge rounded p-3 px-4 animate-card-in relative" id="thumbnailPreview">
      {thumbnail && (
        <img id="thumbnailImg" src={thumbnail} alt="Video thumbnail" className="w-[100px] h-14 object-cover rounded-xs shrink-0 bg-surface-3" />
      )}
      <div className="flex flex-col gap-[3px] min-w-0 flex-1">
        <span className="text-[0.85rem] font-semibold text-primary truncate" id="thumbnailTitle">{title}</span>
        <span className="text-[0.73rem] text-muted" id="thumbnailMeta">
          {[channel, durationStr].filter(Boolean).join(' · ')}
        </span>
      </div>
      <button
        className="btn-icon absolute top-2 right-2 w-[26px] h-[26px] border-none"
        onClick={() => setThumbnailData(null)}
        aria-label={t('form.dismissPreview')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
