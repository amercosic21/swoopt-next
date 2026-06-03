# Swoopt

A self-hosted media downloader built with Next.js. Paste a URL, pick a format, and download videos or audio from YouTube, Vimeo, SoundCloud, Twitter/X, Instagram, TikTok, Dailymotion, and Twitch.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8)
![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-red)

## Features

- **Video & audio downloads** — MP4, WebM, MP3, M4A, WAV, FLAC, Opus
- **Quality selection** — From 144p to 4K, plus "Best" auto-selection
- **Playlist support** — Download entire playlists with progress tracking per item
- **Live progress** — Real-time progress bars, download speed, and file size
- **Pause & resume** — Pause active downloads and resume them later
- **Resumable file delivery** — Completed files stream with HTTP Range support, so browser downloads can resume and seek
- **Download history** — View completed, failed, and cancelled downloads with retry
- **Thumbnail preview** — Auto-fetches video thumbnails before downloading
- **Settings** — Speed limits, browser cookies, captions, metadata embedding, thumbnail embedding
- **Dark & light themes** — Smooth theme transitions with system preference detection
- **Internationalization** — English and Bosnian, easily extensible
- **Engine updates** — Daily yt-dlp self-update, plus an in-app banner that notifies when a newer version is available and updates it with one click (localhost only)

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Zustand
- **Backend:** Next.js API routes, Node.js worker processes
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [FFmpeg](https://ffmpeg.org/)

## Prerequisites

- Node.js 20+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and available in PATH
- [FFmpeg](https://ffmpeg.org/) installed and available in PATH

## Setup

```bash
# Clone the repository
git clone https://github.com/amercosic21/swoopt-next.git
cd swoopt-next

# Install dependencies
npm install

# Create environment file (optional)
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Create a `.env.local` file to customize:

```env
YTDLP_BIN=yt-dlp          # Path to yt-dlp binary
FFMPEG_BIN=ffmpeg          # Path to ffmpeg binary
NODE_BIN=node              # Path to node (yt-dlp JS runtime for YouTube on Windows)
MAX_CONCURRENT_JOBS=3      # Max simultaneous downloads
JOB_TTL=86400              # Job data retention in seconds (default: 24h)
```

See `.env.example` for a copyable template.

## Project Structure

```
app/
  api/              # API routes (download, pause, resume, cancel, etc.)
  downloads/        # Authenticated file serving for completed downloads
  globals.css       # Tailwind theme & component styles
  layout.tsx        # Root layout
  page.tsx          # Main page (wires everything together)
  error.tsx         # Error boundary fallback for the page
components/         # React UI components (Header, DownloadForm, JobCard, etc.)
hooks/              # React hooks (useI18n, usePolling, useTheme)
store/              # Zustand client state
utils/              # Pure, client-safe shared helpers
  http.ts           #   postJson / postJsonVoid fetch wrappers
  format.ts         #   formatDuration / formatBytes
  url.ts            #   URL detection (single vs playlist), normalization
  formats.ts        #   Format/quality option lists
  jobMessages.ts    #   Maps a finished job to its completion toast
i18n/               # Internationalization (shared client/server)
  locales/          #   One file per language — en.ts is canonical
  translations.ts   #   Assembles locales + getTranslation()
  errors.ts         #   Maps yt-dlp errors to friendly messages
lib/                # Server/worker logic — never imported by client code
  Downloader.ts     #   Orchestrates a download (dispatch + run)
  progress.ts       #   Parses yt-dlp stdout into job progress
  metadata.ts       #   Background title/thumbnail/filesize enrichment
  probe.ts          #   ffprobe-based delivered-quality check
  FormatResolver.ts #   Maps quality/format keys to yt-dlp flags
  JobManager.ts     #   Job persistence (JSON files)
  Settings.ts       #   Settings & stats persistence
  Sanitizer.ts      #   Input validation
  apiHelpers.ts     #   Shared API-route helpers (error mapping, cleanup, localhost gate)
  ytdlpVersion.ts   #   Installed-vs-latest yt-dlp version check (cached)
  jsonFile.ts       #   Atomic JSON read/write helpers
  config.ts         #   Env-derived paths and constants
types/              # Shared TypeScript types
worker/             # Background download worker (spawned per job via tsx)
tests/              # Vitest unit tests (pure logic: URL/format/version helpers)
```

> **Boundary note:** `lib/` is imported both by API routes and by the standalone
> `worker/` process (run through `tsx`), so it must stay free of React/browser
> code and of the `server-only` package. Code shared with the UI lives in
> `utils/` (pure helpers) or `i18n/` (message strings), never in `lib/`.

## How It Works

1. User submits a URL with format/quality preferences
2. The API creates a job and spawns a background worker process
3. The worker runs yt-dlp with the requested options and writes progress to a job file
4. The frontend polls for progress updates and displays real-time status
5. Completed files are saved to the `downloads/` directory

## Testing

Unit tests (Vitest) cover the pure logic: URL classification, format/quality
resolution, and version comparison.

```bash
npm test
```

## Production

```bash
npm run build
npm start
```

## License

MIT
