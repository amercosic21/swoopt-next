import type { Job, ToastType } from '@/types';
import type { TranslationKey } from '@/i18n/translations';

/**
 * Picks the toast translation key + type for a completed job: a low-quality
 * warning, a "some items skipped" warning, or a plain success. The caller
 * translates the key (via the useI18n hook or getTranslation).
 */
export function completionToast(job: Job): { key: TranslationKey; type: ToastType } {
  if (!job.warning) return { key: 'toast.downloadComplete', type: 'success' };
  if (/quality/i.test(job.warning)) return { key: 'toast.lowQuality', type: 'info' };
  return { key: 'toast.doneSkipped', type: 'info' };
}
