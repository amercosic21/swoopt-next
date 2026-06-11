# Swoopt

<img width="1917" height="987" alt="image" src="https://github.com/user-attachments/assets/e425d7f0-2766-45a3-91de-0d1fba8033a6" />


<img width="1437" height="671" alt="image" src="https://github.com/user-attachments/assets/53d6c9d3-26f7-4af5-a914-7873b37a95a8" />



A self-hosted media downloader built with Next.js. Paste a URL, pick a format, and download videos or audio from YouTube, Vimeo, SoundCloud, Twitter/X, Instagram, TikTok, Dailymotion, and Twitch.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8)
![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-red)

## Features

- **Video & audio downloads** - MP4, WebM, MP3, M4A, WAV, FLAC, Opus
- **Quality selection** - From 144p to 4K, plus "Best" auto-selection
- **Playlist support** - Download entire playlists with progress tracking per item
- **Live progress** - Real-time progress bars, download speed, and file size
- **Pause & resume** - Pause active downloads and resume them later
- **Resumable file delivery** - Completed files stream with HTTP Range support, so browser downloads can resume and seek
- **Download history** - View completed, failed, and cancelled downloads with retry
- **Thumbnail preview** - Auto-fetches video thumbnails before downloading
- **Settings** - Speed limits, browser cookies, captions, metadata embedding, thumbnail embedding
- **Dark & light themes** - Smooth theme transitions with system preference detection
- **Internationalization** - English and Bosnian, easily extensible
- **Engine updates** - Daily yt-dlp self-update, plus an in-app banner that notifies when a newer version is available and updates it with one click (localhost only)

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Zustand
- **Backend:** Next.js API routes, Node.js worker processes
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [FFmpeg](https://ffmpeg.org/)

## Getting Started

Swoopt needs two kinds of tools on your machine: **Node.js** to run the app itself,
and the **download engine** (`yt-dlp` + `ffmpeg`/`ffprobe`) that does the actual work.

### 1. Install the tools

| Tool | Why it's needed |
| --- | --- |
| **Node.js 20+** | Runs the Next.js app. The [official installer](https://nodejs.org/) adds it to your PATH automatically. |
| **yt-dlp** | Fetches and downloads the media. |
| **ffmpeg** (includes **ffprobe**) | Merges video+audio, remuxes, and verifies delivered quality. |

The app finds `yt-dlp`, `ffmpeg`, and `ffprobe` by name, so they need to be on your
**PATH** - the list of folders your operating system searches when you run a command
by name. You have two ways to satisfy this:

**Option A - put them on PATH (recommended, zero config).** Once they're on PATH,
no extra configuration is needed. Easiest installs:

```bash
# Windows (Scoop):
scoop install yt-dlp ffmpeg

# macOS (Homebrew):
brew install yt-dlp ffmpeg

# Linux (Debian/Ubuntu):
sudo apt install ffmpeg && sudo pipx install yt-dlp
```

On Windows, if you don't have Scoop yet, install it once first - in a normal
(non-admin) PowerShell - then run the command above:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

See [scoop.sh](https://scoop.sh) for details. Prefer not to use a package manager?
Just download the standalone binaries, drop them in any folder (e.g.
`C:\Users\<you>\bin`), and add that folder to your PATH.

> **After installing the tools, open a new terminal** - or restart your editor/IDE if
> you run commands from its built-in terminal - so it picks up the updated PATH. A
> shell that was already open won't see the new tools until it's relaunched.

**Option B - point the app at explicit paths.** If you'd rather not touch PATH,
install the tools anywhere and tell the app where they are via `.env.local`
(see [Environment Variables](#environment-variables)).

> ffprobe ships inside the ffmpeg package, so wherever `ffmpeg.exe` goes, make sure
> `ffprobe.exe` lands beside it.

> **Keeping yt-dlp current:** the in-app update button (and a daily background check)
> work out how yt-dlp was installed and update it the right way - `scoop update` for a
> Scoop install, `yt-dlp -U` for a standalone binary. If you installed it through some
> other package manager (Homebrew, apt/pipx), update it through that manager instead.
> Downloads keep working either way.

### 2. Get the app

```bash
git clone https://github.com/amercosic21/swoopt-next.git
cd swoopt-next
```

### 3. Run it

```bash
# Development (hot reload):
npm install
npm run dev

# Production (faster, used by the Windows launcher below):
npm install
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

## Quick Launch (Windows)

Instead of opening a terminal every time, you can launch Swoopt from a Desktop
shortcut. The `launcher/` folder contains everything for this.

### One-time setup

1. Make sure the tools from [Getting Started](#1-install-the-tools) are installed
   (and a `.env.local` exists if you went with Option B).
2. Double-click **`launcher/install-shortcut.bat`**. This creates a **Swoopt**
   shortcut on your Desktop.

### Daily use

Double-click the **Swoopt** Desktop shortcut. It will:

- on the very first launch, run `npm install` and `npm run build` once (so you don't
  have to),
- start the server and open `http://localhost:3000` in your browser,
- stay minimized in the taskbar - close that window to stop the server.

If a server is already running, clicking the shortcut just reopens the browser tab
instead of starting a second one.

> After pulling new code changes, run `npm run build` once so the launcher serves the
> latest version (it only auto-builds when no build exists yet).

### Launcher files

```
launcher/
  start-swoopt.bat       # what the shortcut runs (path-independent)
  install-shortcut.bat   # double-click once to create the Desktop shortcut
  install-shortcut.ps1   # the PowerShell the installer calls
  swoopt.ico             # the shortcut icon
```

## Environment Variables

Everything here is optional, and the values shown below are the built-in defaults.
If those work for you, you don't need a `.env.local` at all - create one (by copying
`.env.example`) only when you actually want to change something.

```env
# Binaries - leave these unset to find them on your PATH (recommended). Set an
# absolute path only if you want to pin a specific binary instead of the PATH one.
YTDLP_BIN=yt-dlp           # the yt-dlp executable
FFMPEG_BIN=ffmpeg          # the ffmpeg executable (ffprobe is found next to it)
NODE_BIN=node              # node, used as yt-dlp's JS runtime for YouTube on Windows

# Behavior
MAX_CONCURRENT_JOBS=3      # how many downloads run at once; the rest wait in a queue
JOB_TTL=86400              # how long finished downloads stay in your history before
                           # they're auto-cleared, in seconds (86400 = 24 hours)
```

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
  locales/          #   One file per language - en.ts is canonical
  translations.ts   #   Assembles locales + getTranslation()
  errors.ts         #   Maps yt-dlp errors to friendly messages
lib/                # Server/worker logic - never imported by client code
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

## License

MIT
