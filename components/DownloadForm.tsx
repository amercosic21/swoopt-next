'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/hooks/useI18n';
import { usePolling } from '@/hooks/usePolling';
import { postJson } from '@/utils/http';
import { formatDuration } from '@/utils/format';
import { detectUrlType, stripPlaylistParams, normalizeUrl } from '@/utils/url';
import {
  VIDEO_QUALITIES, AUDIO_QUALITIES, ALL_FORMATS, AUDIO_FORMATS, AUDIO_ONLY_PLATFORMS,
  type QualityOption,
} from '@/utils/formats';
import type { Job } from '@/types';

export function DownloadForm() {
  const { t } = useI18n();
  const { startPolling } = usePolling();
  const {
    selectedFormat, selectedQuality,
    setFormat, setQuality,
    addActiveJob, addToast,
    thumbnailData, setThumbnailData,
  } = useStore();

  const [url, setUrl] = useState('');
  const [type, setType] = useState<'single' | 'playlist'>('single');
  const [lockedType, setLockedType] = useState<'single' | 'playlist' | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [hint, setHint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const thumbnailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailAbort = useRef<AbortController | null>(null);

  const isAudio = AUDIO_FORMATS.includes(selectedFormat);
  const qualities: QualityOption[] = isAudio ? AUDIO_QUALITIES : VIDEO_QUALITIES;
  const visibleFormats = audioOnly ? AUDIO_FORMATS : ALL_FORMATS;

  // Thumbnail fetch with debounce
  const fetchThumbnail = useCallback(async (inputUrl: string) => {
    if (thumbnailTimer.current) clearTimeout(thumbnailTimer.current);
    if (thumbnailAbort.current) thumbnailAbort.current.abort();

    if (!inputUrl) { setThumbnailData(null); return; }

    thumbnailTimer.current = setTimeout(async () => {
      const ac = new AbortController();
      thumbnailAbort.current = ac;
      try {
        const res = await fetch(`/api/thumbnail?url=${encodeURIComponent(inputUrl)}`, { signal: ac.signal });
        if (!res.ok) { setThumbnailData(null); return; }
        const data = await res.json();
        if (data.error) { setThumbnailData(null); return; }
        setThumbnailData({
          title: data.title,
          thumbnail: data.thumbnail,
          channel: data.channel,
          duration: data.duration,
        });
        // Restrict to audio formats if the content has no video track
        if (data.has_video === false) {
          setAudioOnly(true);
          if (!AUDIO_FORMATS.includes(selectedFormat)) {
            setFormat('mp3');
            setQuality('best');
          }
        } else if (data.has_video === true && !AUDIO_ONLY_PLATFORMS.test(inputUrl)) {
          setAudioOnly(false);
        }
      } catch { /* aborted or network error */ }
    }, 800);
  }, [setThumbnailData, selectedFormat, setFormat, setQuality]);

  const handleUrlChange = (val: string) => {
    setUrl(val);
    // Immediately clear stale thumbnail when URL changes
    setThumbnailData(null);
    if (thumbnailAbort.current) thumbnailAbort.current.abort();

    // Normalize URL for detection and thumbnail fetch
    const normalized = normalizeUrl(val);
    const detected = detectUrlType(normalized);
    if (detected === 'single') {
      setLockedType('single');
      setType('single');
    } else if (detected === 'playlist') {
      setLockedType('playlist');
      setType('playlist');
    } else if (detected === 'video-in-playlist') {
      // Video within a playlist — default to single but allow switching to playlist
      setLockedType(null);
      setType('single');
    } else {
      setLockedType(null);
    }

    const isAudioPlatform = normalized ? AUDIO_ONLY_PLATFORMS.test(normalized) : false;
    setAudioOnly(isAudioPlatform);
    if (isAudioPlatform && !AUDIO_FORMATS.includes(selectedFormat)) {
      setFormat('mp3');
      setQuality('best');
    } else if (!isAudioPlatform && AUDIO_FORMATS.includes(selectedFormat)) {
      // Restore video format when switching away from audio-only platform
      setFormat('mp4');
      setQuality('best');
    }

    fetchThumbnail(normalized);
  };

  const handleSubmit = async () => {
    let trimmedUrl = url.trim();
    setHint('');

    if (!trimmedUrl) { setHint(t('form.enterUrl')); return; }

    // Auto-prepend https:// if the user omitted the protocol
    const normalized = normalizeUrl(trimmedUrl);
    if (normalized !== trimmedUrl) { trimmedUrl = normalized; setUrl(trimmedUrl); }

    const finalUrl = type === 'single' ? stripPlaylistParams(trimmedUrl) : trimmedUrl;
    const format = `${selectedFormat}_${selectedQuality}`;
    const thumb = thumbnailData ? { ...thumbnailData } : null;

    setSubmitting(true);
    setThumbnailData(null);

    try {
      const body: Record<string, unknown> = { url: finalUrl, format, type };
      if (thumb) {
        body.thumbnail_url      = thumb.thumbnail;
        body.thumbnail_title    = thumb.title;
        body.thumbnail_channel  = thumb.channel;
        body.thumbnail_duration = formatDuration(thumb.duration);
      }

      const { ok, data } = await postJson<{
        job_id: string; status?: Job['status']; queue_pos?: number;
        meta?: Record<string, string>; error?: string;
      }>('/api/download', body);

      if (!ok) { setHint(data.error ?? t('form.unknownError')); return; }

      setUrl('');

      if (data.queue_pos) addToast(t('toast.queued', { pos: data.queue_pos }), 'info');
      else addToast(t('toast.downloadStarted'), 'success');

      const meta = data.meta || {};
      const cardJob: Job = {
        id: data.job_id,
        url: finalUrl,
        format,
        type,
        status: data.status || 'queued',
        progress: 0,
        current_item: 0,
        total_items: 0,
        current_title: meta.thumbnail_title || thumb?.title || '',
        output_dir: '',
        files: [],
        error: null,
        pid: null,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        thumbnail_url:      meta.thumbnail_url     || thumb?.thumbnail || '',
        thumbnail_channel:  meta.thumbnail_channel || thumb?.channel   || '',
        thumbnail_duration: meta.thumbnail_duration || (thumb ? formatDuration(thumb.duration) : ''),
      };

      addActiveJob(data.job_id, cardJob);
      startPolling(data.job_id);
    } catch {
      setHint(t('form.serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Global Ctrl+V shortcut
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const active = document.activeElement;
        const isInput = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
        if (!isInput) {
          e.preventDefault();
          try {
            const text = await navigator.clipboard.readText();
            if (text?.trim()) handleUrlChange(text.trim());
          } catch { /* no clipboard access */ }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // When format changes, ensure quality is valid for new format
  useEffect(() => {
    const newIsAudio = AUDIO_FORMATS.includes(selectedFormat);
    const newQualities = newIsAudio ? AUDIO_QUALITIES : VIDEO_QUALITIES;
    if (!newQualities.some(q => q.value === selectedQuality)) setQuality('best');
  }, [selectedFormat, selectedQuality, setQuality]);

  return (
    <section className="form-card bg-surface border border-edge rounded p-[26px] shadow-[var(--shadow)] flex flex-col gap-[22px] relative overflow-hidden max-[480px]:p-[18px_16px] min-[1200px]:p-8 min-[1200px]:gap-[26px] min-[1920px]:p-9 min-[1920px]:gap-7">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-secondary" htmlFor="urlInput">{t('form.url')}</label>
          <span className="text-[0.68rem] text-muted font-medium">{t('form.kbdHint')}</span>
        </div>
        <input
          type="url"
          id="urlInput"
          className="input-field w-full bg-surface-2 border border-edge rounded-sm text-primary font-sans text-[0.95rem] py-[11px] px-[15px] outline-none"
          placeholder={t('form.placeholder')}
          value={url}
          onChange={e => handleUrlChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="grid grid-cols-[auto_auto_1fr] gap-7 items-start max-[700px]:grid-cols-1 max-[700px]:gap-5">
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-secondary">{t('form.format')}</span>
          <div className="flex flex-wrap gap-1.5" id="formatGroup">
            {visibleFormats.map((fmt, i) => (
              <button
                key={fmt}
                className={`chip animate-chip-enter ${selectedFormat === fmt ? 'chip-active' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => setFormat(fmt)}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-secondary">{t('form.quality')}</span>
          <div className="grid grid-cols-5 gap-1.5" id="qualityGroup">
            {qualities.map(({ value, label }) => (
              <button
                key={value}
                className={`chip ${selectedQuality === value ? 'chip-active' : ''}`}
                onClick={() => setQuality(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 justify-self-end">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-secondary">{t('form.type')}</span>
          <div className="inline-flex bg-surface-2 border border-edge rounded-sm overflow-hidden" id="typeGroup">
            <button
              className={`toggle-btn ${type === 'single' ? 'toggle-active' : ''}`}
              disabled={lockedType === 'playlist'}
              onClick={() => lockedType !== 'playlist' && setType('single')}
            >
              {t('form.single')}
            </button>
            <button
              className={`toggle-btn ${type === 'playlist' ? 'toggle-active' : ''}`}
              disabled={lockedType === 'single'}
              onClick={() => lockedType !== 'single' && setType('playlist')}
            >
              {t('form.playlist')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 max-[480px]:flex-col max-[480px]:items-stretch">
        <span className="text-[0.82rem] text-danger min-h-[1.2em] flex-1" id="formHint">{hint}</span>
        <button
          className="btn-primary border-none rounded-sm text-white cursor-pointer inline-flex items-center font-sans text-[0.9rem] font-semibold gap-2 py-[11px] px-6 whitespace-nowrap max-[480px]:justify-center"
          id="downloadBtn"
          disabled={submitting}
          onClick={handleSubmit}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={16} height={16}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {submitting ? t('form.starting') : t('form.download')}
        </button>
      </div>
    </section>
  );
}
