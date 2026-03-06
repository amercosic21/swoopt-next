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
- **Download history** — View completed, failed, and cancelled downloads with retry
- **Thumbnail preview** — Auto-fetches video thumbnails before downloading
- **Settings** — Speed limits, browser cookies, captions, metadata embedding, thumbnail embedding
- **Dark & light themes** — Smooth theme transitions with system preference detection
- **Internationalization** — English and Bosnian, easily extensible
- **Auto-updating** — Built-in yt-dlp self-update mechanism

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Zustand
- **Backend:** Next.js API routes, Node.js worker processes
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [FFmpeg](https://ffmpeg.org/)

## Prerequisites

- Node.js 18+
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
MAX_CONCURRENT_JOBS=3      # Max simultaneous downloads
JOB_TTL=86400              # Job data retention in seconds (default: 24h)
```

## Project Structure

```
app/
  api/              # API routes (download, pause, resume, cancel, etc.)
  globals.css       # Tailwind theme & component styles
  layout.tsx        # Root layout
  page.tsx          # Main page
components/         # React components (Header, DownloadForm, JobCard, etc.)
hooks/              # Custom hooks (useI18n, usePolling, useTheme)
lib/                # Server-side modules (Downloader, JobManager, Settings)
store/              # Zustand state management
worker/             # Background download worker (spawned per job)
```

## How It Works

1. User submits a URL with format/quality preferences
2. The API creates a job and spawns a background worker process
3. The worker runs yt-dlp with the requested options and writes progress to a job file
4. The frontend polls for progress updates and displays real-time status
5. Completed files are saved to the `downloads/` directory

## Production

```bash
npm run build
npm start
```

## License

MIT
