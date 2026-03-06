'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ── Translations ────────────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'app.title': 'Swoopt',
    'stats.files': '{count} files',
    'stats.file': '{count} file',
    'theme.toggle': 'Toggle light/dark theme',
    'settings.label': 'Settings',
    'lang.label': 'Language',
    'settings.title': 'Settings',
    'settings.close': 'Close settings',
    'settings.speedLimit': 'Speed Limit',
    'settings.speedLimit.desc': 'Cap the download speed. Leave empty for unlimited.',
    'settings.unlimited': 'Unlimited',
    'settings.browserCookies': 'Browser Cookies',
    'settings.browserCookies.desc': 'Import cookies from your browser for private or age-restricted content.',
    'settings.disabled': 'Disabled',
    'settings.downloadCaptions': 'Download Captions',
    'settings.embedMetadata': 'Embed Metadata',
    'settings.embedThumbnail': 'Embed Thumbnail',
    'settings.reduceAnimations': 'Reduce Animations',
    'settings.downloadEngine': 'Download Engine',
    'settings.downloadEngine.desc': 'Keep the download engine up to date',
    'settings.checkUpdates': 'Check for Updates',
    'settings.save': 'Save Settings',
    'settings.saving': 'Saving\u2026',
    'settings.saved': 'Saved!',
    'settings.errorSaving': 'Error saving.',
    'settings.networkError': 'Network error.',
    'settings.updating': 'Updating\u2026',
    'form.url': 'URL',
    'form.kbdHint': 'Ctrl+V to paste & go',
    'form.placeholder': 'https://youtube.com/watch?v=... or playlist link',
    'form.format': 'Format',
    'form.quality': 'Quality',
    'form.type': 'Type',
    'form.single': 'Single',
    'form.playlist': 'Playlist',
    'form.download': 'Download',
    'form.enterUrl': 'Please enter a URL.',
    'form.starting': 'Starting\u2026',
    'form.serverError': 'Could not reach the server.',
    'form.unknownError': 'Unknown error.',
    'form.dismissPreview': 'Dismiss preview',
    'active.title': 'Active Downloads',
    'active.pause': 'Pause',
    'active.resume': 'Resume',
    'active.cancel': 'Cancel',
    'active.pausing': 'Pausing\u2026',
    'active.resuming': 'Resuming\u2026',
    'phase.queued': 'Queued',
    'phase.paused': 'Paused',
    'phase.completed': 'Completed',
    'phase.failed': 'Failed',
    'phase.cancelled': 'Cancelled',
    'phase.resuming': 'Resuming',
    'phase.merging': 'Merging',
    'phase.processing': 'Processing',
    'phase.downloading': 'Downloading',
    'phase.resumingEllipsis': 'Resuming\u2026',
    'phase.mergingEllipsis': 'Merging\u2026',
    'phase.processingEllipsis': 'Processing\u2026',
    'playlist.item': 'Item {current} of {total}',
    'history.title': 'History',
    'history.collapse': 'Collapse',
    'history.expand': 'Expand',
    'history.clearAll': 'Clear all',
    'history.empty': 'No downloads yet. Paste a URL above to get started.',
    'history.savedToDownloads': 'Saved to Downloads',
    'history.retry': 'Retry',
    'history.removeFromHistory': 'Remove from history',
    'history.delete': 'Delete',
    'toast.queued': 'Queued (#{pos}). Will start automatically.',
    'toast.downloadStarted': 'Download started!',
    'toast.downloadResumed': 'Download resumed.',
    'toast.downloadPaused': 'Download paused.',
    'toast.downloadRemoved': 'Download removed.',
    'toast.downloadCancelled': 'Download cancelled.',
    'toast.couldNotPause': 'Could not pause.',
    'toast.couldNotResume': 'Could not resume.',
    'toast.couldNotCancel': 'Could not cancel.',
    'toast.downloadComplete': 'Download complete!',
    'toast.doneSkipped': 'Done \u2014 some items were skipped.',
    'toast.downloadFailed': 'Download failed.',
    'toast.cancelled': 'Cancelled.',
    'toast.engineUpdated': 'Download engine updated successfully!',
    'toast.engineUpToDate': 'Download engine is already up to date.',
    'toast.updateCompleted': 'Update completed.',
    'toast.updateFailed': 'Failed to update download engine.',
    'toast.enginePipError': 'yt-dlp was installed via pip. Run "pip install -U yt-dlp" to update.',
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'url.isPlaylist': 'This URL is a playlist',
    'url.isSingle': 'This URL is a single video',
    'error.unknown': 'An unknown error occurred.',
    'error.unavailable': 'This video is unavailable or has been removed.',
    'error.private': 'This video is private or age-restricted and cannot be downloaded.',
    'error.copyright': 'This video was removed due to a copyright claim.',
    'error.formatUnavailable': 'The selected quality or format is not available for this video. Try a lower quality or a different format.',
    'error.playlistNotFound': 'This playlist was not found. It may be private or deleted.',
    'error.premiere': 'This video is a scheduled premiere or live event and is not yet available.',
    'error.liveStream': 'Live streams cannot be downloaded while they are broadcasting.',
    'error.extraction': 'Could not extract video information. The URL may be unsupported or the page has changed.',
    'error.forbidden': 'Access was denied by the server (403). The video may be geo-restricted or require a login.',
    'error.notFound': 'The video page was not found (404). The URL may be incorrect or the video deleted.',
    'error.tooManyRequests': 'Too many requests were made. Please wait a moment and try again.',
    'error.network': 'A network error occurred. Check your internet connection and try again.',
    'error.ffmpeg': 'An error occurred while combining the video and audio streams. Please try again.',
    'error.noFormats': 'No downloadable formats were found for this URL.',
    'error.loginRequired': 'This video requires a login and cannot be downloaded.',
    'error.membersOnly': 'This video is for channel members only and cannot be downloaded.',
    'error.genericFailed': 'The download failed. Please check the URL and try again.',
  },
  bs: {
    'app.title': 'Swoopt',
    'stats.files': '{count} fajlova',
    'stats.file': '{count} fajl',
    'theme.toggle': 'Promijeni svijetlu/tamnu temu',
    'settings.label': 'Postavke',
    'lang.label': 'Jezik',
    'settings.title': 'Postavke',
    'settings.close': 'Zatvori postavke',
    'settings.speedLimit': 'Ograničenje brzine',
    'settings.speedLimit.desc': 'Ograničite brzinu preuzimanja. Ostavite prazno za neograničeno.',
    'settings.unlimited': 'Neograničeno',
    'settings.browserCookies': 'Kolačići preglednika',
    'settings.browserCookies.desc': 'Uvezite kolačiće iz preglednika za privatni ili dobno ograničeni sadržaj.',
    'settings.disabled': 'Isključeno',
    'settings.downloadCaptions': 'Preuzmi titlove',
    'settings.embedMetadata': 'Ugradi metapodatke',
    'settings.embedThumbnail': 'Ugradi sličicu',
    'settings.reduceAnimations': 'Smanji animacije',
    'settings.downloadEngine': 'Motor za preuzimanje',
    'settings.downloadEngine.desc': 'Održavajte motor za preuzimanje ažurnim',
    'settings.checkUpdates': 'Provjeri ažuriranja',
    'settings.save': 'Spremi postavke',
    'settings.saving': 'Spremanje\u2026',
    'settings.saved': 'Spremljeno!',
    'settings.errorSaving': 'Greška pri spremanju.',
    'settings.networkError': 'Greška mreže.',
    'settings.updating': 'Ažuriranje\u2026',
    'form.url': 'URL',
    'form.kbdHint': 'Ctrl+V za lijepljenje i pokretanje',
    'form.placeholder': 'https://youtube.com/watch?v=... ili link playliste',
    'form.format': 'Format',
    'form.quality': 'Kvaliteta',
    'form.type': 'Tip',
    'form.single': 'Pojedinačno',
    'form.playlist': 'Playlista',
    'form.download': 'Preuzmi',
    'form.enterUrl': 'Molimo unesite URL.',
    'form.starting': 'Pokretanje\u2026',
    'form.serverError': 'Nije moguće kontaktirati server.',
    'form.unknownError': 'Nepoznata greška.',
    'form.dismissPreview': 'Zatvori pregled',
    'active.title': 'Aktivna preuzimanja',
    'active.pause': 'Pauziraj',
    'active.resume': 'Nastavi',
    'active.cancel': 'Otkaži',
    'active.pausing': 'Pauziranje\u2026',
    'active.resuming': 'Nastavljanje\u2026',
    'phase.queued': 'U redu čekanja',
    'phase.paused': 'Pauzirano',
    'phase.completed': 'Završeno',
    'phase.failed': 'Neuspjelo',
    'phase.cancelled': 'Otkazano',
    'phase.resuming': 'Nastavljanje',
    'phase.merging': 'Spajanje',
    'phase.processing': 'Obrada',
    'phase.downloading': 'Preuzimanje',
    'phase.resumingEllipsis': 'Nastavljanje\u2026',
    'phase.mergingEllipsis': 'Spajanje\u2026',
    'phase.processingEllipsis': 'Obrada\u2026',
    'playlist.item': 'Stavka {current} od {total}',
    'history.title': 'Historija',
    'history.collapse': 'Skupi',
    'history.expand': 'Proširi',
    'history.clearAll': 'Obriši sve',
    'history.empty': 'Nema preuzimanja. Zalijepite URL iznad za početak.',
    'history.savedToDownloads': 'Spremljeno u Preuzimanja',
    'history.retry': 'Pokušaj ponovo',
    'history.removeFromHistory': 'Ukloni iz historije',
    'history.delete': 'Obriši',
    'toast.queued': 'U redu čekanja (#{pos}). Počet će automatski.',
    'toast.downloadStarted': 'Preuzimanje pokrenuto!',
    'toast.downloadResumed': 'Preuzimanje nastavljeno.',
    'toast.downloadPaused': 'Preuzimanje pauzirano.',
    'toast.downloadRemoved': 'Preuzimanje uklonjeno.',
    'toast.downloadCancelled': 'Preuzimanje otkazano.',
    'toast.couldNotPause': 'Pauziranje nije uspjelo.',
    'toast.couldNotResume': 'Nastavljanje nije uspjelo.',
    'toast.couldNotCancel': 'Otkazivanje nije uspjelo.',
    'toast.downloadComplete': 'Preuzimanje završeno!',
    'toast.doneSkipped': 'Završeno \u2014 neke stavke su preskočene.',
    'toast.downloadFailed': 'Preuzimanje neuspjelo.',
    'toast.cancelled': 'Otkazano.',
    'toast.engineUpdated': 'Motor za preuzimanje uspješno ažuriran!',
    'toast.engineUpToDate': 'Motor za preuzimanje je već ažuran.',
    'toast.updateCompleted': 'Ažuriranje završeno.',
    'toast.updateFailed': 'Ažuriranje motora za preuzimanje nije uspjelo.',
    'toast.enginePipError': 'yt-dlp je instaliran preko pip-a. Pokrenite "pip install -U yt-dlp" za ažuriranje.',
    'time.today': 'Danas',
    'time.yesterday': 'Jučer',
    'url.isPlaylist': 'Ovaj URL je playlista',
    'url.isSingle': 'Ovaj URL je pojedinačni video',
    'error.unknown': 'Došlo je do nepoznate greške.',
    'error.unavailable': 'Ovaj video nije dostupan ili je uklonjen.',
    'error.private': 'Ovaj video je privatan ili dobno ograničen i ne može se preuzeti.',
    'error.copyright': 'Ovaj video je uklonjen zbog kršenja autorskih prava.',
    'error.formatUnavailable': 'Odabrana kvaliteta ili format nisu dostupni za ovaj video. Pokušajte nižu kvalitetu ili drugi format.',
    'error.playlistNotFound': 'Ova playlista nije pronađena. Možda je privatna ili obrisana.',
    'error.premiere': 'Ovaj video je zakazana premijera ili događaj uživo i još nije dostupan.',
    'error.liveStream': 'Prijenos uživo se ne može preuzeti dok je u toku.',
    'error.extraction': 'Nije moguće izvući informacije o videu. URL možda nije podržan ili se stranica promijenila.',
    'error.forbidden': 'Server je odbio pristup (403). Video može biti geografski ograničen ili zahtijeva prijavu.',
    'error.notFound': 'Stranica videa nije pronađena (404). URL je možda netačan ili je video obrisan.',
    'error.tooManyRequests': 'Previše zahtjeva. Molimo pričekajte trenutak i pokušajte ponovo.',
    'error.network': 'Došlo je do mrežne greške. Provjerite internetsku vezu i pokušajte ponovo.',
    'error.ffmpeg': 'Došlo je do greške pri spajanju video i audio tokova. Pokušajte ponovo.',
    'error.noFormats': 'Nisu pronađeni formati za preuzimanje za ovaj URL.',
    'error.loginRequired': 'Ovaj video zahtijeva prijavu i ne može se preuzeti.',
    'error.membersOnly': 'Ovaj video je samo za članove kanala i ne može se preuzeti.',
    'error.genericFailed': 'Preuzimanje nije uspjelo. Provjerite URL i pokušajte ponovo.',
  },
};

// ── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLang: (lang: string) => void;
  availableLangs: string[];
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
  availableLangs: ['en', 'bs'],
});

export function useI18n() {
  return useContext(I18nContext);
}

export function useI18nProvider() {
  const [lang, setLangState] = useState<string>('en');

  useEffect(() => {
    const saved = localStorage.getItem('sw_lang');
    if (saved && TRANSLATIONS[saved]) {
      setLangState(saved);
    } else {
      const browserLang = (navigator.language || 'en').split('-')[0];
      setLangState(TRANSLATIONS[browserLang] ? browserLang : 'en');
    }
  }, []);

  const setLang = useCallback((newLang: string) => {
    if (!TRANSLATIONS[newLang]) return;
    setLangState(newLang);
    localStorage.setItem('sw_lang', newLang);
    document.documentElement.lang = newLang;
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const str = (TRANSLATIONS[lang]?.[key]) || TRANSLATIONS.en[key] || key;
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  }, [lang]);

  return { lang, t, setLang, availableLangs: Object.keys(TRANSLATIONS) };
}

// ── Standalone translation function (for use outside React components) ───────
// Reads current language from localStorage — useful in setInterval callbacks etc.
export function getTranslation(key: string, params?: Record<string, string | number>): string {
  const lang = (typeof window !== 'undefined' ? localStorage.getItem('sw_lang') : null) || 'en';
  const str = (TRANSLATIONS[lang]?.[key]) || TRANSLATIONS.en[key] || key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
