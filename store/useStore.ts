'use client';

import { create } from 'zustand';
import type { Job, ToastItem, ToastType } from '@/types';

// ── localStorage helpers for active job IDs ──────────────────────────────────
function getSavedActiveJobs(): string[] {
  try { return JSON.parse(localStorage.getItem('sw_active_jobs') ?? '[]'); } catch { return []; }
}
function saveActiveJobIds(ids: string[]) {
  localStorage.setItem('sw_active_jobs', JSON.stringify(ids));
}
function persistActiveJobs(m: Map<string, Job>) {
  saveActiveJobIds(Array.from(m.keys()));
}

// ── localStorage helpers for format/quality ──────────────────────────────────
function getSavedFormat(): string {
  return localStorage.getItem('sw_format') || 'mp4';
}
function getSavedQuality(): string {
  return localStorage.getItem('sw_quality') || 'best';
}

interface AppState {
  // Active jobs (polling)
  activeJobs: Map<string, Job>;
  addActiveJob: (id: string, job: Job) => void;
  updateActiveJob: (id: string, changes: Partial<Job>) => void;
  removeActiveJob: (id: string) => void;

  // History
  historyJobs: Job[];
  setHistoryJobs: (jobs: Job[]) => void;
  prependHistory: (job: Job) => void;
  removeHistory: (id: string) => void;

  // Delivered playlist files (per job) — tracks what's already been auto-downloaded
  deliveredFiles: Map<string, Set<string>>;
  addDelivered: (jobId: string, files: string[]) => void;
  clearDelivered: (jobId: string) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  // Stats
  statsCount: number;
  statsSize: number;
  setStats: (count: number, size: number) => void;

  // UI
  selectedFormat: string;
  selectedQuality: string;
  setFormat: (format: string) => void;
  setQuality: (quality: string) => void;

  // Thumbnail preview
  thumbnailData: { title: string; thumbnail: string; channel: string; duration: string } | null;
  setThumbnailData: (data: AppState['thumbnailData']) => void;
}

export const useStore = create<AppState>((set) => ({
  activeJobs: new Map(),
  addActiveJob: (id, job) => set(s => {
    const m = new Map(s.activeJobs);
    m.set(id, job);
    persistActiveJobs(m);
    return { activeJobs: m };
  }),
  updateActiveJob: (id, changes) => set(s => {
    const m = new Map(s.activeJobs);
    const existing = m.get(id);
    if (existing) m.set(id, { ...existing, ...changes });
    return { activeJobs: m };
  }),
  removeActiveJob: (id) => set(s => {
    const m = new Map(s.activeJobs);
    m.delete(id);
    persistActiveJobs(m);
    return { activeJobs: m };
  }),

  historyJobs: [],
  setHistoryJobs: (jobs) => set({ historyJobs: jobs }),
  prependHistory: (job) => set(s => ({ historyJobs: [job, ...s.historyJobs.filter(j => j.id !== job.id)] })),
  removeHistory: (id) => set(s => ({ historyJobs: s.historyJobs.filter(j => j.id !== id) })),

  deliveredFiles: new Map(),
  addDelivered: (jobId, files) => set(s => {
    const m = new Map(s.deliveredFiles);
    const existing = m.get(jobId) || new Set<string>();
    files.forEach(f => existing.add(f));
    m.set(jobId, existing);
    return { deliveredFiles: m };
  }),
  clearDelivered: (jobId) => set(s => {
    const m = new Map(s.deliveredFiles);
    m.delete(jobId);
    return { deliveredFiles: m };
  }),

  toasts: [],
  addToast: (message, type = 'info') => set(s => {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastItem = { id, message, type };
    setTimeout(() => {
      useStore.getState().removeToast(id);
    }, 4000);
    return { toasts: [...s.toasts, toast] };
  }),
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  statsCount: 0,
  statsSize: 0,
  setStats: (count, size) => set({ statsCount: count, statsSize: size }),

  selectedFormat: 'mp4',
  selectedQuality: 'best',
  setFormat: (format) => {
    localStorage.setItem('sw_format', format);
    set({ selectedFormat: format });
  },
  setQuality: (quality) => {
    localStorage.setItem('sw_quality', quality);
    set({ selectedQuality: quality });
  },

  thumbnailData: null,
  setThumbnailData: (data) => set({ thumbnailData: data }),
}));

export { getSavedActiveJobs };
