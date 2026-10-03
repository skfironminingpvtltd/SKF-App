import { Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
} from 'expo-audio';
import { useSyncExternalStore } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';
import { type SkflMessage } from './chat';


// ════════════════════════════════════════════════════════════════════════════
// audio.ts
// ════════════════════════════════════════════════════════════════════════════

export interface AudioPlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  /** Fetching / buffering the file, not yet able to play */
  loading?: boolean;
  /** Playback could not start (bad URL, unsupported file…) */
  error?: boolean;
}

type StatusCallback = (state: AudioPlaybackState) => void;

const IDLE: AudioPlaybackState = { isPlaying: false, positionMs: 0, durationMs: 0 };

/**
 * Voice-note playback + recording.
 *
 * Playback: one voice note plays at a time (starting another stops the first). The
 * active note keeps playing if its bubble scrolls off screen, and a bubble that comes
 * back re-attaches with `subscribe`. Always plays at normal (1x) speed.
 *
 * Native uses expo-audio; web uses a plain HTMLAudioElement.
 */
class SafeAudioService {
  // ── playback state (shared by native + web) ──
  private url: string | null = null;
  private cb: StatusCallback | null = null;
  private last: AudioPlaybackState = IDLE;
  private finished = false;
  private loadTimer: any = null;
  private loaded = false;

  // native
  private player: AudioPlayer | null = null;
  private sub: { remove: () => void } | null = null;
  // web
  private webAudio: HTMLAudioElement | null = null;

  // recording (native)
  private recorder: AudioRecorder | null = null;

  private emit(state: AudioPlaybackState) {
    this.last = state;
    this.cb?.(state);
  }

  /** Re-attach a (re)mounted bubble to the note that is currently active, if it is this one. */
  subscribe(url: string, cb: StatusCallback) {
    if (this.url === url) {
      this.cb = cb;
      cb(this.last);
    }
  }

  /** Detach a bubble without stopping playback. */
  unsubscribe(url: string, cb: StatusCallback) {
    if (this.url === url && this.cb === cb) this.cb = null;
  }

  async play(url: string, onStatus?: StatusCallback): Promise<void> {
    // Resume the same note
    if (this.url === url && (this.player || this.webAudio)) {
      if (onStatus) this.cb = onStatus;
      try {
        if (this.finished) {
          this.finished = false;
          if (this.player) await this.player.seekTo(0);
          if (this.webAudio) this.webAudio.currentTime = 0;
        }
        if (this.player) this.player.play();
        if (this.webAudio) await this.webAudio.play();
      } catch (err) {
        console.warn('[Audio] resume failed:', err);
        this.emit({ ...this.last, isPlaying: false, error: true });
      }
      return;
    }

    // Different note: stop whatever was playing (its bubble is told it stopped)
    this.teardown(true);
    this.url = url;
    this.cb = onStatus || null;
    this.finished = false;
    this.loaded = false;
    this.emit({ ...IDLE, loading: true });

    try {
      if (Platform.OS === 'web') {
        const audio = new Audio(url);
        this.webAudio = audio;
        audio.ontimeupdate = () =>
          this.emit({
            isPlaying: !audio.paused,
            positionMs: Math.floor(audio.currentTime * 1000),
            durationMs: Number.isFinite(audio.duration) ? Math.floor(audio.duration * 1000) : this.last.durationMs,
          });
        audio.onplaying = () => this.emit({ ...this.last, isPlaying: true, loading: false });
        audio.onpause = () => this.emit({ ...this.last, isPlaying: false });
        audio.onwaiting = () => this.emit({ ...this.last, loading: true });
        audio.onended = () => {
          this.finished = true;
          this.emit({ isPlaying: false, positionMs: 0, durationMs: this.last.durationMs });
        };
        audio.onerror = () => this.emit({ ...IDLE, error: true });
        await audio.play();
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const player = createAudioPlayer({ uri: url }, { updateInterval: 100 });
      this.player = player;
      this.sub = player.addListener('playbackStatusUpdate', (st: AudioStatus) => {
        if (this.player !== player) return;
        if (st.didJustFinish) {
          this.finished = true;
          this.emit({ isPlaying: false, positionMs: 0, durationMs: st.duration > 0 ? st.duration * 1000 : this.last.durationMs });
          return;
        }
        if (st.isLoaded) this.loaded = true;
        this.emit({
          isPlaying: st.playing,
          positionMs: Math.max(0, st.currentTime * 1000),
          durationMs: st.duration > 0 ? st.duration * 1000 : this.last.durationMs,
          loading: !st.isLoaded || (st.isBuffering && !st.playing),
        });
      });
      player.play();

      // Watchdog: a file that never loads (deleted, empty, no network) must not spin forever
      const failIfNotLoaded = setTimeout(() => {
        if (this.player === player && !this.last.isPlaying && (this.last.loading || this.last.positionMs === 0) && !this.loaded) {
          const cb = this.cb;
          this.teardown(false);
          cb?.({ ...IDLE, error: true });
        }
      }, 12000);
      this.loadTimer = failIfNotLoaded;
    } catch (err) {
      console.warn('[Audio] playback failed:', err);
      this.emit({ ...IDLE, error: true });
    }
  }

  async pause(): Promise<void> {
    try {
      this.player?.pause();
      this.webAudio?.pause();
    } catch (e) {}
    if (this.url) this.emit({ ...this.last, isPlaying: false });
  }

  async seekTo(ms: number): Promise<void> {
    try {
      if (this.player) await this.player.seekTo(ms / 1000);
      if (this.webAudio) this.webAudio.currentTime = ms / 1000;
      this.finished = false;
      if (this.url) this.emit({ ...this.last, positionMs: ms });
    } catch (e) {}
  }

  /** Stop and release the active note. */
  stop(): void {
    this.teardown(true);
  }

  private teardown(notify: boolean) {
    clearTimeout(this.loadTimer);
    const cb = this.cb;
    const durationMs = this.last.durationMs;
    try {
      this.sub?.remove();
      this.player?.remove();
    } catch (e) {}
    try {
      if (this.webAudio) {
        this.webAudio.pause();
        this.webAudio.src = '';
      }
    } catch (e) {}
    this.sub = null;
    this.player = null;
    this.webAudio = null;
    this.url = null;
    this.cb = null;
    this.last = IDLE;
    this.finished = false;
    if (notify && cb) cb({ isPlaying: false, positionMs: 0, durationMs });
  }

  // ─────────────────────────── RECORDING (native) ───────────────────────────

  /** Ask for the mic and start recording a voice note. */
  async startRecording(): Promise<'ok' | 'denied' | 'error'> {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return 'denied';
      this.teardown(true); // never record while a note is playing
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const recorder = new AudioModule.AudioRecorder({
        ...RecordingPresets.HIGH_QUALITY,
        numberOfChannels: 1, // voice only — half the size
        bitRate: 64000,
        isMeteringEnabled: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      this.recorder = recorder;
      return 'ok';
    } catch (err) {
      console.warn('[Audio] startRecording failed:', err);
      this.recorder = null;
      return 'error';
    }
  }

  /** Current input level 0..1 (from the mic meter), or null when unavailable. */
  getRecordingLevel(): number | null {
    try {
      const m = this.recorder?.getStatus().metering;
      if (typeof m !== 'number') return null;
      // metering is dB (≈ -60 quiet … 0 loud); map to 0..1 with a little curve so speech reads clearly
      return Math.pow(Math.max(0, Math.min(1, (m + 55) / 55)), 0.8);
    } catch (e) {
      return null;
    }
  }

  /** Pause the recording in progress (the file keeps what was captured so far). */
  pauseRecording(): boolean {
    try {
      this.recorder?.pause();
      return !!this.recorder;
    } catch (e) {
      return false;
    }
  }

  /** Continue a paused recording into the same file. */
  resumeRecording(): boolean {
    try {
      this.recorder?.record();
      return !!this.recorder;
    } catch (e) {
      return false;
    }
  }

  /** Stop and return the recorded file, or null if nothing usable was captured. */
  async finishRecording(): Promise<{ uri: string; durationMs: number } | null> {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) return null;
    try {
      const durationMs = Math.round(recorder.getStatus().durationMillis || recorder.currentTime * 1000 || 0);
      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      return uri ? { uri, durationMs } : null;
    } catch (err) {
      console.warn('[Audio] finishRecording failed:', err);
      return null;
    }
  }

  async cancelRecording(): Promise<void> {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) return;
    try {
      await recorder.stop();
    } catch (e) {}
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }
}

export const safeAudio = new SafeAudioService();

// ════════════════════════════════════════════════════════════════════════════
// uploadProgress.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * How far along an upload is, by message id (0..1). A bubble that is still being sent reads it to draw
 * its round progress ring; `undefined` means "not uploading".
 */

const progress = new Map<string, number>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function setUploadProgress(id: string, fraction: number) {
  const f = Math.max(0, Math.min(1, fraction));
  // ring updates need not be finer than 1%
  const prev = progress.get(id);
  if (prev !== undefined && Math.abs(prev - f) < 0.01 && f < 1) return;
  progress.set(id, f);
  emit();
}

export function clearUploadProgress(id: string) {
  if (progress.delete(id)) emit();
}

export function useUploadProgress(id: string): number | undefined {
  return useSyncExternalStore(subscribe, () => progress.get(id));
}

// ════════════════════════════════════════════════════════════════════════════
// download.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Downloading a chat attachment to the phone:
 *   1. download it,
 *   2. keep a copy in the phone's storage — photos, videos and audio go to the Gallery / media library,
 *      documents (and anything the library refuses) go into a folder the user picks once (e.g. Downloads),
 *   3. show the system's "Open with" list so the file opens in whichever app the person prefers
 *      (Android: a VIEW intent; iPhone: the share sheet, which also has "Open in…" and "Save to Files").
 */

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic',
  mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', '3gp': 'video/3gpp', webm: 'video/webm',
  m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', amr: 'audio/amr',
  pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain', json: 'application/json', zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
};

const EXT_BY_TYPE: Record<string, string> = { image: 'jpg', video: 'mp4', audio: 'm4a', file: 'bin' };

export type DownloadResult = { ok: boolean; message: string };

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');
/**
 * A file name that is safe inside a file:// path. Android rejects paths containing spaces, [ ], { }, #, %, ' and
 * friends ("Illegal character in path"), and chat files like "Song - Name [Site].mp3" are full of them.
 * Dots stay, so the extension survives; letters from any language stay too.
 */
export const safeFileName = (n: string) =>
  n
    .replace(/[\\/:*?"<>|\s\[\]{}()#%^`'~;=@&+$,!]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|_+$/g, '') || 'file';
const safeName = safeFileName;

function kindOf(mime: string, type: string): 'image' | 'video' | 'audio' | 'file' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return type === 'image' || type === 'video' || type === 'audio' ? type : 'file';
}

/**
 * Direct save to the phone's downloads folder.
 * Uses persistent document storage downloads folder with safe copy / bytes fallback.
 * Never throws permission errors and never prompts the user for folder access.
 */
export async function saveToDownloads(src: File, name: string, mime: string): Promise<File | null> {
  const safeTargetName = safeFileName(name);

  try {
    const dlDir = new Directory(Paths.document, 'downloads');
    if (!dlDir.exists) {
      try {
        dlDir.create({ intermediates: true, idempotent: true });
      } catch (_) {}
    }

    const targetFile = new File(dlDir, safeTargetName);
    if (targetFile.exists) {
      try {
        targetFile.delete();
      } catch (_) {}
    }

    try {
      await src.copy(targetFile, { overwrite: true });
      if (targetFile.exists) return targetFile;
    } catch (_) {
      try {
        const bytes = await src.bytes();
        const out = dlDir.createFile(safeTargetName, mime || 'application/octet-stream');
        out.write(bytes);
        if (out.exists) return out;
      } catch (_) {}
    }

    return targetFile.exists ? targetFile : src;
  } catch (e) {
    console.warn('[Download] saveToDownloads failed:', e);
    return src;
  }
}

/**
 * Add a photo / video / audio file to the phone's media library (Gallery, Music).
 * Android 13+: requires no permissions for app's own files.
 * Android 10-12 / iOS: requests permission if needed.
 * Always fails gracefully without throwing.
 */
async function saveToMediaLibrary(uri: string): Promise<boolean> {
  try {
    const Media = require('expo-media-library/legacy');
    if (Platform.OS === 'ios') {
      const res = await Media.requestPermissionsAsync(true);
      if (!res.granted) return false;
    } else if (Number(Platform.Version) < 33) {
      const res = await Media.requestPermissionsAsync(true, ['audio', 'photo', 'video']);
      if (!res.granted) return false;
    }
    await Media.saveToLibraryAsync(uri);
    return true;
  } catch (e) {
    console.warn('[MediaLibrary] saveToLibraryAsync failed:', e);
    return false;
  }
}

/**
 * Save a copy of a downloaded attachment into public storage.
 * - Images and videos are saved directly into the phone's Gallery (Photos).
 * - Audio is saved to Music.
 * - All attachments are saved with clean names in persistent downloads storage.
 * Does NOT open any folder selection modal.
 */
export async function savePublicCopy(
  src: File,
  name: string,
  mime: string,
  type: string
): Promise<{ savedText: string; openUri: string }> {
  const kind = kindOf(mime, type);
  let savedText = '';
  let openUri = src.uri;

  // 1. For images, videos and audio: save to Media Library (Gallery / Music)
  let mediaSaved = false;
  if (kind === 'image' || kind === 'video' || kind === 'audio') {
    try {
      mediaSaved = await saveToMediaLibrary(src.uri);
    } catch (e) {
      console.warn('[Download] media library save failed:', e);
    }
  }

  // 2. Also keep a cleanly-named copy in the persistent downloads storage
  try {
    const downloadedFile = await saveToDownloads(src, name, mime);
    if (downloadedFile) {
      openUri = downloadedFile.uri;
    }
  } catch (_) {}

  if (mediaSaved) {
    savedText = kind === 'audio' ? 'Saved to Music' : 'Saved to Gallery';
  } else {
    savedText = 'Saved to Downloads';
  }

  return { savedText, openUri };
}

export async function openWithSystem(uri: string, mime: string): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const IntentLauncher = require('expo-intent-launcher');
      const data = uri.startsWith('content://')
        ? uri
        : await require('expo-file-system/legacy').getContentUriAsync(uri);
      // VIEW + a type: Android lists every app that can open this kind of file ("Open with")
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data, flags: 1, type: mime });
      return true;
    }
    const Sharing = require('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: mime });
      return true;
    }
  } catch (e) {
    // no app can open it directly: fall back to the share sheet
    try {
      const Sharing = require('expo-sharing');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: mime });
        return true;
      }
    } catch (e2) {}
  }
  return false;
}

/** The MIME type of a message's attachment — from its file name first, since phones often report the wrong one. */
export function mimeOfMessage(msg: SkflMessage): string {
  const ext = extOf(msg.media_original_name || msg.media_file_name || '');
  const mime = (ext && MIME_BY_EXT[ext]) || msg.media_mime_type || '';
  return mime && mime !== 'application/octet-stream' ? mime : 'application/octet-stream';
}

/** Download `msg`'s attachment, keep it on the phone, then offer the "Open with" list. */
export async function downloadAndOpen(msg: SkflMessage, onStage?: (text: string) => void): Promise<DownloadResult> {
  const url = msg.media_public_url;
  if (!url) return { ok: false, message: 'Nothing to download' };

  if (Platform.OS === 'web') {
    window.open(url, '_blank');
    return { ok: true, message: 'Opened in a new tab' };
  }

  try {
    // name + type
    let name = safeName(msg.media_original_name || msg.media_file_name || 'file');
    let ext = extOf(name);
    const type = msg.message_type as string;
    let mime = (ext && MIME_BY_EXT[ext]) || msg.media_mime_type || '';
    if (!mime || mime === 'application/octet-stream') mime = (ext && MIME_BY_EXT[ext]) || 'application/octet-stream';
    if (!ext) {
      ext = Object.keys(MIME_BY_EXT).find((k) => MIME_BY_EXT[k] === mime) || EXT_BY_TYPE[type] || 'bin';
      name = `${name}.${ext}`;
    }
    const unique = `${Date.now()}_${name}`;

    // 1) download
    onStage?.('Downloading…');
    const cache = new File(Paths.cache, `skf_${unique}`);
    await File.downloadFileAsync(url, cache, { idempotent: true });

    // 2) keep a copy in the phone's storage
    onStage?.('Saving…');
    const kept = await savePublicCopy(cache, unique.replace(/^\d+_/, ''), mime, type);
    let savedText = kept.savedText;
    const openUri = kept.openUri;

    // For images: they are already saved to the Gallery, and the user is viewing the image in the Lightbox.
    if (type === 'image') {
      return { ok: true, message: savedText || 'Saved to Gallery' };
    }

    // 3) "Open with…" list for videos and documents
    const opened = await openWithSystem(openUri, mime);
    if (!savedText) savedText = 'Saved to Downloads';
    return { ok: true, message: opened ? savedText : `${savedText} — no app found to open it` };
  } catch (e: any) {
    console.warn('[Download] failed:', e);
    return { ok: false, message: 'Download failed. Check your connection and try again.' };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// mediaCache.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Attachments from other people are not fetched until you tap them, like WhatsApp: a photo / video / voice
 * note / file shows a download button with its size, and once downloaded it lives in the app's own storage
 * (nothing to grant), so it opens instantly from then on — also without internet.
 *
 * On top of that a copy is kept where the phone's own apps can see it (Gallery / Music / a folder you picked),
 * saved in the background so the chat never waits for it.
 *
 * `useMediaState(id)` tells a bubble where its attachment stands; `downloadMedia` fetches it (with progress).
 */

export type MediaState = {
  status: 'remote' | 'downloading' | 'ready' | 'error';
  /** 0..1 while downloading */
  progress: number;
  /** local file:// uri once ready */
  uri?: string;
};

const KEY = '@skfl_media_downloads_v1';
const SAVED_KEY = '@skfl_media_saved_v1'; // message ids whose public copy (Gallery / folder) is already made
const REMOTE: MediaState = { status: 'remote', progress: 0 };
const isWeb = Platform.OS === 'web';

const states = new Map<string, MediaState>();
const listeners_mediaCache = new Set<() => void>();
const pending = new Map<string, Promise<string | null>>();
const keeping = new Map<string, Promise<void>>(); // public copies being saved right now
const savedPublic = new Set<string>();

const emit_mediaCache = () => listeners_mediaCache.forEach((l) => l());
const put = (id: string, st: MediaState) => {
  states.set(id, st);
  emit_mediaCache();
};
const subscribe_mediaCache = (l: () => void) => {
  listeners_mediaCache.add(l);
  return () => {
    listeners_mediaCache.delete(l);
  };
};

function persist() {
  const out: Record<string, string> = {};
  states.forEach((st, id) => {
    if (st.status === 'ready' && st.uri) out[id] = st.uri;
  });
  AsyncStorage.setItem(KEY, JSON.stringify(out)).catch(() => {});
}

// Remember what was downloaded in earlier sessions (and forget files that are gone)
if (!isWeb) {
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const saved: Record<string, string> = JSON.parse(raw);
      let changed = false;
      for (const [id, uri] of Object.entries(saved)) {
        let there = false;
        try {
          there = new File(uri).exists;
        } catch (e) {}
        if (there) states.set(id, { status: 'ready', progress: 1, uri });
        else changed = true;
      }
      emit_mediaCache();
      if (changed) persist();
    })
    .catch(() => {});

  AsyncStorage.getItem(SAVED_KEY)
    .then((raw) => {
      if (raw) (JSON.parse(raw) as string[]).forEach((id) => savedPublic.add(id));
    })
    .catch(() => {});
}

export function useMediaState(id: string): MediaState {
  return useSyncExternalStore(subscribe_mediaCache, () => states.get(id) ?? REMOTE);
}

export function getMediaState(id: string): MediaState {
  return states.get(id) ?? REMOTE;
}

/** Whether a tap should download first: someone else's photo / video / voice note that is not on this phone yet. */
export function needsDownload(msg: SkflMessage, isSelf: boolean, st: MediaState): boolean {
  if (isWeb || isSelf || !msg.media_public_url) return false;
  return st.status !== 'ready';
}

const displayName = (msg: SkflMessage) => safeFileName(msg.media_original_name || msg.media_file_name || 'file');

/** Copy a downloaded file to where the phone's own apps can see it. Best effort; never blocks the chat. */
async function saveCopy(msg: SkflMessage, file: File): Promise<void> {
  const name = displayName(msg);
  try {
    const kept = await savePublicCopy(file, name, mimeOfMessage(msg), msg.message_type);
    if (kept.savedText) {
      savedPublic.add(msg.id);
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...savedPublic])).catch(() => {});
    }
  } catch (e) {
    console.warn('[Media] keeping a copy on the phone failed:', e);
  }
}

function keepOnPhone(msg: SkflMessage, file: File): void {
  if (isWeb || savedPublic.has(msg.id) || keeping.has(msg.id)) return;
  const job = saveCopy(msg, file).finally(() => keeping.delete(msg.id));
  keeping.set(msg.id, job);
}

/** Mark an attachment as already downloaded and available locally (e.g. for media sent from this device) */
export function markMediaReady(id: string, uri: string): void {
  put(id, { status: 'ready', progress: 1, uri });
  persist();
}

/** Store a local copy of media sent by this user into skf-media so it never has to be re-downloaded */
export async function cacheSenderMedia(msg: SkflMessage, sourceUri: string): Promise<string> {
  if (isWeb) return sourceUri;
  try {
    const dir = new Directory(Paths.document, 'skf-media');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${msg.id}_${displayName(msg)}`);
    if (sourceUri.startsWith('file://')) {
      const src = new File(sourceUri);
      if (src.exists) {
        await src.copy(dest, { overwrite: true });
        markMediaReady(msg.id, dest.uri);
        return dest.uri;
      }
    }
  } catch (e) {
    console.warn('[Media] cacheSenderMedia failed:', e);
  }
  markMediaReady(msg.id, sourceUri);
  return sourceUri;
}

/** Download the attachment into the app's storage. Resolves with the local uri (null if it failed). */
export function downloadMedia(msg: SkflMessage): Promise<string | null> {
  const url = msg.media_public_url;
  if (!url) return Promise.resolve(null);
  if (isWeb) return Promise.resolve(url);

  const cur = states.get(msg.id);
  if (cur?.status === 'ready' && cur.uri) return Promise.resolve(cur.uri);
  const running = pending.get(msg.id);
  if (running) return running;

  const job = (async (): Promise<string | null> => {
    let dest: File | null = null;
    try {
      const dir = new Directory(Paths.document, 'skf-media');
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      dest = new File(dir, `${msg.id}_${displayName(msg)}`);

      // If the file already exists on this phone (sent by user or downloaded earlier), use it directly
      if (dest.exists) {
        put(msg.id, { status: 'ready', progress: 1, uri: dest.uri });
        persist();
        return dest.uri;
      }

      put(msg.id, { status: 'downloading', progress: 0 });

      let last = 0;
      const task = require('expo-file-system/legacy').createDownloadResumable(
        url,
        dest.uri,
        {},
        (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
          if (p.totalBytesExpectedToWrite <= 0) return;
          const f = Math.min(1, p.totalBytesWritten / p.totalBytesExpectedToWrite);
          if (f - last >= 0.02) {
            last = f;
            put(msg.id, { status: 'downloading', progress: f });
          }
        }
      );
      const res = await task.downloadAsync();
      if (!res || (typeof res.status === 'number' && res.status >= 400)) throw new Error(`HTTP ${res?.status}`);

      put(msg.id, { status: 'ready', progress: 1, uri: dest.uri });
      persist();
      keepOnPhone(msg, dest); // in the background: the chat can open the photo right away
      return dest.uri;
    } catch (e) {
      console.warn('[Media] download failed:', e);
      try {
        if (dest?.exists) dest.delete();
      } catch (e2) {}
      put(msg.id, { status: 'error', progress: 0 });
      return null;
    } finally {
      pending.delete(msg.id);
    }
  })();

  pending.set(msg.id, job);
  return job;
}

/**
 * Open an attachment in the phone's own apps: download it first if needed, then show the system
 * "Open with" list (Android) or share sheet (iPhone). Never the browser.
 */
export async function openInPhone(msg: SkflMessage): Promise<{ ok: boolean; message: string }> {
  if (isWeb) {
    if (msg.media_public_url) window.open(msg.media_public_url, '_blank');
    return { ok: true, message: '' };
  }

  // If already ready in memory, open instantly without any network call
  const cur = states.get(msg.id);
  if (cur?.status === 'ready' && cur.uri) {
    const opened = await openWithSystem(cur.uri, mimeOfMessage(msg));
    return opened ? { ok: true, message: '' } : { ok: false, message: 'No app on this phone can open this file.' };
  }

  // Check if file is already stored in skf-media directory on disk
  try {
    const dir = new Directory(Paths.document, 'skf-media');
    const dest = new File(dir, `${msg.id}_${displayName(msg)}`);
    if (dest.exists) {
      markMediaReady(msg.id, dest.uri);
      const opened = await openWithSystem(dest.uri, mimeOfMessage(msg));
      return opened ? { ok: true, message: '' } : { ok: false, message: 'No app on this phone can open this file.' };
    }
  } catch (_) {}

  // If local file:// URI was directly attached
  if (msg.media_public_url?.startsWith('file://')) {
    try {
      if (new File(msg.media_public_url).exists) {
        markMediaReady(msg.id, msg.media_public_url);
        const opened = await openWithSystem(msg.media_public_url, mimeOfMessage(msg));
        return opened ? { ok: true, message: '' } : { ok: false, message: 'No app on this phone can open this file.' };
      }
    } catch (_) {}
  }

  const uri = await downloadMedia(msg);
  if (!uri) return { ok: false, message: 'Download failed. Check your connection and try again.' };
  // a first-time folder picker / permission dialog from the background copy must not collide with "Open with"
  await keeping.get(msg.id);
  const opened = await openWithSystem(uri, mimeOfMessage(msg));
  return opened ? { ok: true, message: '' } : { ok: false, message: 'No app on this phone can open this file.' };
}
