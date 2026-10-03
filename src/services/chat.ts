import { type RealtimeChannel } from '@supabase/supabase-js';
import { supabase, STORAGE_BUCKET, Config } from './supabase';
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';


// ════════════════════════════════════════════════════════════════════════════
// chat.ts
// ════════════════════════════════════════════════════════════════════════════

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';

/** Everything the `skfl.message_type` column can hold: a poll / event / contact is its own type. */
export type DbMessageType = MessageType | 'poll' | 'event' | 'contact';

// ── The `skfl` table (see supabase/skfl_schema.sql) ─────────────────────────────────────────────
// Five columns: id · message_type · content · created_at · updated_at.
// Everything else lives in `content`, and every key is always present — no data means "" / [] / 0.

export interface SkflResult {
  /** Poll: the option's position ("0", "1", …). Event: "going" | "maybe" | "no". */
  choice: string;
  label: string;
  count: number;
}

export interface SkflVote {
  client_id: string;
  choice: string;
  label: string;
  /** ISO time the answer was given */
  at: string;
}

export interface SkflResponses {
  /** How many people have responded */
  total: number;
  results: SkflResult[];
  votes: SkflVote[];
}

export interface SkflContent {
  /** Message text, or the caption of a photo / video / file */
  text: string;
  sender: { client_id: string; badge: string; avatar_color: string };
  media: {
    file_name: string;
    original_name: string;
    file_size: number | '';
    mime_type: string;
    storage_path: string;
    public_url: string;
    width: number | '';
    height: number | '';
    duration_ms: number | '';
  };
  poll: { question: string; options: string[]; multi: boolean };
  event: { title: string; starts_at: string; location: string; description: string };
  contact: { name: string; phones: string[]; emails: string[] };
  /** The message this one quotes (empty `id` = not a reply) */
  reply_to: {
    id: string;
    sender_badge: string;
    sender_avatar_color: string;
    text: string;
    message_type: string;
    media_url: string;
  };
  responses: SkflResponses;
  /** ISO time once edited, else "" */
  edited_at: string;
  /** ISO time once deleted for everyone, else "" */
  deleted_at: string;
}

export interface SkflRow {
  id: string;
  message_type: DbMessageType;
  content: SkflContent;
  created_at: string;
  updated_at: string;
}

// ── What the screens work with ──────────────────────────────────────────────────────────────────
// A flattened view of a row, built by services/skflContent.ts. A poll / event / contact / reply reaches
// the screens as `SKF_RICH::`-prefixed JSON in `content` (see services/rich.ts); it is never stored that way.
export interface SkflMessage {
  id: string;
  message_type: MessageType;
  content: string | null;

  // Sender
  sender_badge: string;
  sender_avatar_color: string;
  sender_client_id: string;

  // Media fields (all null for text-only)
  media_file_name: string | null;
  media_original_name: string | null;
  media_file_size: number | null;
  media_mime_type: string | null;
  media_storage_path: string | null;
  media_public_url: string | null;
  media_width: number | null;
  media_height: number | null;
  media_duration_ms: number | null;

  // Poll votes / event RSVPs
  responses?: SkflResponses;

  // Timestamps
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
}

// Local anonymous identity (stored in AsyncStorage)
export interface AnonymousIdentity {
  clientId: string;
  badge: string;
  avatarColor: string;
  displayName?: string;
}

export type AnonymousSender = AnonymousIdentity;

export interface MediaMetadata {
  id?: string;
  type?: string;
  fileName?: string;
  originalName?: string;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

// Only used by the standalone MessageBubble / MediaLightboxModal components, which the app does not mount.
// It is not the `skfl` table (that no longer has a status column).
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  media?: MediaMetadata | null;
  sender: AnonymousIdentity;
  createdAt?: string;
  timestamp?: string | number;
  status?: MessageStatus;
}

// ════════════════════════════════════════════════════════════════════════════
// rich.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Rich messages: polls, events, shared contacts and replies.
 *
 * In the database they are structured JSON inside `skfl.content` (see services/skflContent.ts and
 * supabase/skfl_schema.sql). Inside the app a message's `content` string carries them as `SKF_RICH::`
 * followed by JSON, so the screens have one text path for everything. That prefix is never stored.
 * Every screen that shows message text (bubbles, notifications, the long-press menu) goes through
 * `previewText` / `parseRich` so nobody ever sees the raw JSON.
 */

export interface ReplyInfo {
  id: string;
  sender_badge: string;
  /** device id of the quoted message's author: the reliable way to tell "You" from someone else */
  sender_client_id?: string;
  sender_avatar_color?: string;
  text: string;
  message_type?: string;
  media_url?: string;
}

export type RichPayload =
  | { kind: 'poll'; question: string; options: string[]; multi: boolean }
  | { kind: 'event'; title: string; startsAt: string; location?: string; description?: string }
  | { kind: 'contact'; name: string; phones: string[]; emails?: string[] }
  | { kind: 'reply'; replyTo: ReplyInfo; text: string };

const PREFIX = 'SKF_RICH::';

export function encodeRich(payload: RichPayload): string {
  return PREFIX + JSON.stringify(payload);
}

export function parseRich(content?: string | null): RichPayload | null {
  if (!content || !content.startsWith(PREFIX)) return null;
  try {
    const o = JSON.parse(content.slice(PREFIX.length));
    if (o?.kind === 'poll' && typeof o.question === 'string' && Array.isArray(o.options)) {
      return { kind: 'poll', question: o.question, options: o.options.map(String), multi: !!o.multi };
    }
    if (o?.kind === 'event' && typeof o.title === 'string' && typeof o.startsAt === 'string') {
      return { kind: 'event', title: o.title, startsAt: o.startsAt, location: o.location || undefined, description: o.description || undefined };
    }
    if (o?.kind === 'contact' && typeof o.name === 'string') {
      return { kind: 'contact', name: o.name, phones: Array.isArray(o.phones) ? o.phones.map(String) : [], emails: Array.isArray(o.emails) ? o.emails.map(String) : undefined };
    }
    if (o?.kind === 'reply' && o?.replyTo && typeof o.replyTo.sender_badge === 'string') {
      return {
        kind: 'reply',
        replyTo: {
          id: String(o.replyTo.id || ''),
          sender_badge: String(o.replyTo.sender_badge || 'User'),
          sender_client_id: o.replyTo.sender_client_id ? String(o.replyTo.sender_client_id) : undefined,
          sender_avatar_color: o.replyTo.sender_avatar_color ? String(o.replyTo.sender_avatar_color) : undefined,
          text: String(o.replyTo.text || ''),
          message_type: o.replyTo.message_type ? String(o.replyTo.message_type) : undefined,
          media_url: o.replyTo.media_url ? String(o.replyTo.media_url) : undefined,
        },
        text: typeof o.text === 'string' ? o.text : '',
      };
    }
  } catch (e) {}
  return null;
}

/** One-line summary of a message's text, safe for notifications and previews. */
export function previewText(content?: string | null): string {
  const rich = parseRich(content);
  if (!rich) return content || '';
  switch (rich.kind) {
    case 'poll': return `📊 Poll: ${rich.question}`;
    case 'event': return `📅 Event: ${rich.title}`;
    case 'contact': return `👤 Contact: ${rich.name}`;
    case 'reply': return rich.text ? rich.text : `↩ Reply to ${rich.replyTo.sender_badge}`;
  }
}

/** Extracts a concise snippet representing a message for reply quotes and staging */
export function getMessageSnippet(msg: {
  message_type: string;
  content: string | null;
  media_original_name?: string | null;
  media_file_name?: string | null;
  media_public_url?: string | null;
}): { text: string; media_type?: string; media_url?: string } {
  if (msg.message_type === 'image') {
    const rich = parseRich(msg.content);
    const caption = rich?.kind === 'reply' ? rich.text : (msg.content && msg.content !== msg.media_file_name ? msg.content : '');
    return {
      text: caption ? `📷 ${caption}` : '📷 Photo',
      media_type: 'image',
      media_url: msg.media_public_url || undefined,
    };
  }
  if (msg.message_type === 'video') {
    return { text: '🎬 Video', media_type: 'video', media_url: msg.media_public_url || undefined };
  }
  if (msg.message_type === 'audio') {
    return { text: '🎤 Voice message', media_type: 'audio' };
  }
  if (msg.message_type === 'file') {
    const fname = msg.media_original_name || msg.media_file_name || 'Document';
    return { text: `📄 ${fname}`, media_type: 'file' };
  }
  const rich = parseRich(msg.content);
  if (rich) {
    if (rich.kind === 'reply') {
      return { text: rich.text || 'Reply' };
    }
    return { text: previewText(msg.content) };
  }
  return { text: msg.content || '' };
}

/** Voting choices for an event RSVP */
export const EVENT_CHOICES = [
  { id: 'going', label: 'Going' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'no', label: "Can't go" },
] as const;

// ════════════════════════════════════════════════════════════════════════════
// realtimeChannel.ts
// ════════════════════════════════════════════════════════════════════════════

// supabase-js re-joins a dropped channel by itself; give it a head start before rebuilding.
const RETRY_BASE_MS = 4000;
const RETRY_MAX_MS = 30000;
// Only a long outage deserves a warning banner — a Wi-Fi blip or a phone waking up does not.
const WARN_AFTER_RETRIES = 5;

/**
 * A realtime channel that heals itself.
 *
 * Phones drop the live connection all the time (Wi-Fi blip, screen off, dev server restart, token
 * refresh). That is normal, so it is logged quietly — no warning banner. If the channel has not come
 * back shortly, it is rebuilt from scratch with growing delays (4s, 8s, 16s… max 30s) until it is
 * connected again, and `onReconnect` fires so the caller can re-sync whatever it missed meanwhile.
 *
 * `attach` adds the `.on(...)` listeners; it runs again for every rebuilt channel.
 * Returns a function that stops everything and removes the channel.
 */
export function managedChannel(
  label: string,
  attach: (channel: RealtimeChannel) => void,
  onReconnect?: () => void
): () => void {
  let stopped = false;
  let channel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retries = 0;
  let hadProblem = false;

  const connect = () => {
    if (stopped) return;
    const previous = channel;
    const ch = supabase.channel(`${label}_${Date.now()}_${Math.floor(Math.random() * 100000)}`);
    channel = ch; // set first, so the old channel's late "closed" event is recognised as stale
    if (previous) {
      try {
        supabase.removeChannel(previous);
      } catch {
        // already gone
      }
    }
    attach(ch);

    ch.subscribe((status, err) => {
      if (stopped || ch !== channel) return;

      if (status === 'SUBSCRIBED') {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        retries = 0;
        console.log(`[Realtime:${label}] connected`);
        if (hadProblem) {
          hadProblem = false;
          onReconnect?.();
        }
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        hadProblem = true;
        console.log(`[Realtime:${label}] ${status}${err ? ` (${(err as Error).message ?? err})` : ''} — reconnecting`);
        if (retryTimer) return; // a rebuild is already scheduled
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** retries);
        retries += 1;
        if (retries === WARN_AFTER_RETRIES) {
          console.warn(`[Realtime:${label}] still offline after several tries — will keep retrying`);
        }
        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect();
        }, delay);
      }
    });
  };

  connect();

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        // already gone
      }
      channel = null;
    }
  };
}

// ════════════════════════════════════════════════════════════════════════════
// skflContent.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * The `skfl` table stores each message as { id, message_type, content, created_at, updated_at } with a
 * JSON `content` (supabase/skfl_schema.sql). This file is the only place that knows that layout:
 *   rowToMessage  — table row → the flat SkflMessage every screen uses
 *   buildContent  — a message being sent → the row to insert
 */

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
/** JSON has "" for "no value", numbers included */
const numOrBlank = (v: unknown): number | '' => num(v) ?? '';

export function emptyResponses(): SkflResponses {
  return { total: 0, results: [], votes: [] };
}

/** A content object with every key present and empty — the same shape the database fills in. */
export function emptyContent(): SkflContent {
  return {
    text: '',
    sender: { client_id: '', badge: '', avatar_color: '' },
    media: {
      file_name: '', original_name: '', file_size: '', mime_type: '',
      storage_path: '', public_url: '', width: '', height: '', duration_ms: '',
    },
    poll: { question: '', options: [], multi: false },
    event: { title: '', starts_at: '', location: '', description: '' },
    contact: { name: '', phones: [], emails: [] },
    reply_to: { id: '', sender_badge: '', sender_avatar_color: '', text: '', message_type: '', media_url: '' },
    responses: emptyResponses(),
    edited_at: '',
    deleted_at: '',
  };
}

function normalizeResponses(raw: any): SkflResponses {
  const votes = Array.isArray(raw?.votes)
    ? raw.votes.map((v: any) => ({
        client_id: str(v?.client_id), choice: str(v?.choice), label: str(v?.label), at: str(v?.at),
      }))
    : [];
  const results = Array.isArray(raw?.results)
    ? raw.results.map((r: any) => ({ choice: str(r?.choice), label: str(r?.label), count: num(r?.count) ?? 0 }))
    : [];
  return { total: num(raw?.total) ?? new Set(votes.map((v: { client_id: string }) => v.client_id)).size, results, votes };
}

/** Fill any missing key (a row typed by hand in the table editor, say) so readers never hit undefined. */
export function normalizeContent(raw: unknown): SkflContent {
  const c: any = raw && typeof raw === 'object' ? raw : {};
  return {
    text: str(c.text),
    sender: { client_id: str(c.sender?.client_id), badge: str(c.sender?.badge), avatar_color: str(c.sender?.avatar_color) },
    media: {
      file_name: str(c.media?.file_name),
      original_name: str(c.media?.original_name),
      file_size: numOrBlank(c.media?.file_size),
      mime_type: str(c.media?.mime_type),
      storage_path: str(c.media?.storage_path),
      public_url: str(c.media?.public_url),
      width: numOrBlank(c.media?.width),
      height: numOrBlank(c.media?.height),
      duration_ms: numOrBlank(c.media?.duration_ms),
    },
    poll: { question: str(c.poll?.question), options: strList(c.poll?.options), multi: c.poll?.multi === true },
    event: {
      title: str(c.event?.title), starts_at: str(c.event?.starts_at),
      location: str(c.event?.location), description: str(c.event?.description),
    },
    contact: { name: str(c.contact?.name), phones: strList(c.contact?.phones), emails: strList(c.contact?.emails) },
    reply_to: {
      id: str(c.reply_to?.id),
      sender_badge: str(c.reply_to?.sender_badge),
      sender_avatar_color: str(c.reply_to?.sender_avatar_color),
      text: str(c.reply_to?.text),
      message_type: str(c.reply_to?.message_type),
      media_url: str(c.reply_to?.media_url),
    },
    responses: c.responses ? normalizeResponses(c.responses) : emptyResponses(),
    edited_at: str(c.edited_at),
    deleted_at: str(c.deleted_at),
  };
}

const MEDIA_TYPES: MessageType[] = ['text', 'image', 'audio', 'video', 'file'];

/** Table row → the flat message the screens use. */
export function rowToMessage(row: SkflRow): SkflMessage {
  const c = normalizeContent(row.content);
  const deleted = c.deleted_at !== '';

  let message_type: MessageType = 'text';
  let content: string | null = null;

  if (!deleted) {
    switch (row.message_type) {
      case 'poll':
        content = encodeRich({ kind: 'poll', question: c.poll.question, options: c.poll.options, multi: c.poll.multi });
        break;
      case 'event':
        content = encodeRich({
          kind: 'event',
          title: c.event.title,
          startsAt: c.event.starts_at,
          location: c.event.location || undefined,
          description: c.event.description || undefined,
        });
        break;
      case 'contact':
        content = encodeRich({
          kind: 'contact',
          name: c.contact.name,
          phones: c.contact.phones,
          emails: c.contact.emails.length ? c.contact.emails : undefined,
        });
        break;
      default:
        content = c.reply_to.id
          ? encodeRich({
              kind: 'reply',
              replyTo: {
                id: c.reply_to.id,
                sender_badge: c.reply_to.sender_badge,
                sender_avatar_color: c.reply_to.sender_avatar_color || undefined,
                text: c.reply_to.text,
                message_type: c.reply_to.message_type || undefined,
                media_url: c.reply_to.media_url || undefined,
              },
              text: c.text,
            })
          : c.text || null;
    }
  }
  if (MEDIA_TYPES.includes(row.message_type as MessageType)) message_type = row.message_type as MessageType;

  return {
    id: row.id,
    message_type,
    content,
    sender_badge: c.sender.badge || 'Anonymous',
    sender_avatar_color: c.sender.avatar_color || '#128C7E',
    sender_client_id: c.sender.client_id,
    media_file_name: c.media.file_name || null,
    media_original_name: c.media.original_name || null,
    media_file_size: num(c.media.file_size),
    media_mime_type: c.media.mime_type || null,
    media_storage_path: c.media.storage_path || null,
    media_public_url: c.media.public_url || null,
    media_width: num(c.media.width),
    media_height: num(c.media.height),
    media_duration_ms: num(c.media.duration_ms),
    responses: c.responses,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited_at: c.edited_at || null,
    deleted_at: c.deleted_at || null,
  };
}

export interface OutgoingMedia {
  file_name?: string;
  original_name?: string;
  file_size?: number;
  mime_type?: string;
  storage_path?: string;
  public_url?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
}

/**
 * A message being sent → the row to insert. `content` is what the composer produced: plain text, or
 * `SKF_RICH::` JSON for a poll / event / contact / reply.
 */
export function buildContent(
  identity: AnonymousIdentity,
  messageType: MessageType,
  content: string | null,
  media?: OutgoingMedia
): { message_type: DbMessageType; content: SkflContent } {
  const c = emptyContent();
  c.sender = { client_id: identity.clientId, badge: identity.badge, avatar_color: identity.avatarColor };

  if (media) {
    c.media = {
      file_name: media.file_name ?? '',
      original_name: media.original_name ?? '',
      file_size: media.file_size || '',
      mime_type: media.mime_type ?? '',
      storage_path: media.storage_path ?? '',
      public_url: media.public_url ?? '',
      width: media.width || '',
      height: media.height || '',
      duration_ms: media.duration_ms || '',
    };
  }

  let message_type: DbMessageType = messageType;
  const rich = parseRich(content);

  if (!rich) {
    // The composer uses the file name as the "text" of a photo / file when there is no caption — that is not a caption
    const isFileName = !!content && (content === media?.original_name || content === media?.file_name);
    c.text = messageType !== 'text' && isFileName ? '' : content ?? '';
  } else if (rich.kind === 'poll') {
    message_type = 'poll';
    c.poll = { question: rich.question, options: rich.options, multi: rich.multi };
  } else if (rich.kind === 'event') {
    message_type = 'event';
    c.event = {
      title: rich.title,
      starts_at: rich.startsAt,
      location: rich.location ?? '',
      description: rich.description ?? '',
    };
  } else if (rich.kind === 'contact') {
    message_type = 'contact';
    c.contact = { name: rich.name, phones: rich.phones, emails: rich.emails ?? [] };
  } else {
    c.text = rich.text;
    c.reply_to = {
      id: rich.replyTo.id,
      sender_badge: rich.replyTo.sender_badge,
      sender_avatar_color: rich.replyTo.sender_avatar_color ?? '',
      text: rich.replyTo.text,
      message_type: rich.replyTo.message_type ?? '',
      media_url: rich.replyTo.media_url ?? '',
    };
  }

  return { message_type, content: c };
}

// ════════════════════════════════════════════════════════════════════════════
// messages.ts
// ════════════════════════════════════════════════════════════════════════════

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function decodeBase64ToArrayBuffer(input: string): ArrayBuffer {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const str = input.replace(/=+$/, '');
  const bytes = new Uint8Array((str.length * 3) >> 2);
  let p = 0;
  for (let i = 0; i < str.length; i += 4) {
    const a = CHARS.indexOf(str[i]);
    const b = CHARS.indexOf(str[i + 1]);
    const c = CHARS.indexOf(str[i + 2]);
    const d = CHARS.indexOf(str[i + 3]);
    bytes[p++] = (a << 2) | (b >> 4);
    if (c >= 0) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

/** Extension → safe MIME map for all common document/office/archive types.
 *  The OS (especially Android) frequently returns text/plain for CSV, DOC,
 *  XLSX, and many other files, which Supabase Storage rejects. We always
 *  resolve from the file extension FIRST, using the OS mime only as a
 *  secondary hint, and fall back to application/octet-stream as a safe
 *  universal binary container that every Supabase bucket accepts. */
const EXT_MIME: Record<string, string> = {
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heic',
  // Video
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', webm: 'video/webm',
  // Audio
  mp3: 'audio/mpeg', m4a: 'audio/m4a', aac: 'audio/aac',
  wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  opus: 'audio/opus', webma: 'audio/webm',
  // PDF / Office / Documents
  pdf: 'application/pdf',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt:  'application/vnd.oasis.opendocument.text',
  ods:  'application/vnd.oasis.opendocument.spreadsheet',
  odp:  'application/vnd.oasis.opendocument.presentation',
  // Text / Data  (text/plain is NOT accepted by the bucket → use octet-stream)
  txt:  'application/octet-stream',
  csv:  'application/octet-stream',
  tsv:  'application/octet-stream',
  log:  'application/octet-stream',
  md:   'application/octet-stream',
  json: 'application/octet-stream',
  xml:  'application/octet-stream',
  // Archives / Packages
  zip:  'application/zip',
  rar:  'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar:  'application/x-tar',
  gz:   'application/gzip',
  apk:  'application/vnd.android.package-archive',
  // eBook / other
  epub: 'application/epub+zip',
  rtf:  'application/rtf',
};

function getSupportedMimeType(originalMime?: string, fileName?: string): string {
  const name = (fileName || '').toLowerCase();
  const mime = (originalMime || '').toLowerCase().trim();

  // 1️⃣  Extension wins — OS lies about MIME type frequently on Android
  const ext = name.split('.').pop() ?? '';
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext];

  // 2️⃣  OS MIME is reliable for the major media types (camera / gallery)
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/webp') return 'image/webp';
  if (mime === 'image/jpeg') return 'image/jpeg';
  if (mime.startsWith('image/')) return 'image/jpeg';          // safe fallback for images
  if (mime === 'video/mp4') return 'video/mp4';
  if (mime === 'video/quicktime') return 'video/quicktime';
  if (mime.startsWith('video/')) return 'video/mp4';           // safe fallback for video
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return 'audio/mpeg';
  if (mime === 'audio/m4a' || mime === 'audio/x-m4a' || mime === 'audio/mp4') return 'audio/m4a';
  if (mime === 'audio/webm') return 'audio/webm';
  if (mime.startsWith('audio/')) return 'application/octet-stream';
  if (mime === 'application/pdf') return 'application/pdf';

  // 3️⃣  Anything that is text/* must NOT be sent as-is — use binary wrapper
  if (mime.startsWith('text/')) return 'application/octet-stream';

  // 4️⃣  Known safe application/* types pass through
  if (mime.startsWith('application/')) return mime;

  // 5️⃣  Unknown / empty — safest binary container
  return 'application/octet-stream';
}

export const MESSAGE_PAGE_SIZE = 30;

export interface MessagePage {
  /** Chronological (oldest → newest) human messages of this page */
  messages: SkflMessage[];
  /** True when older messages remain beyond this page */
  hasMore: boolean;
  /** False when the request failed (so callers don't mistake it for "no more") */
  ok: boolean;
}

/**
 * Automatically retry once after a short delay if Supabase PostgREST returns
 * "JWT issued at future" (PGRST303) caused by transient clock drift between
 * the Supabase Auth server and the PostgREST / database node.
 */
async function retryOnClockSkew<T extends { error: any }>(fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  if (result?.error && /JWT issued at future/i.test(result.error.message || '')) {
    await new Promise((r) => setTimeout(r, 650));
    return await fn();
  }
  return result;
}

/**
 * Fetch one page of messages from the Supabase skfl table (human messages only).
 * Without `before` this is the newest page; with `before` (an ISO created_at) it is
 * the page of messages immediately older than that timestamp.
 */
export async function fetchMessagesPage(before?: string): Promise<MessagePage> {
  const { data, error } = await retryOnClockSkew(() => {
    let query = supabase
      .from('skfl')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (before) query = query.lt('created_at', before);
    return query;
  });

  if (error) {
    console.error('[Supabase] fetchMessagesPage error:', error.message);
    return { messages: [], hasMore: false, ok: false };
  }
  const rows = (data || []) as SkflRow[];
  // Enforce restriction: strictly filter out any automated system or test bot messages
  const messages = rows.map(rowToMessage).filter(isHumanMessage).reverse();
  return { messages, hasMore: rows.length === MESSAGE_PAGE_SIZE, ok: true };
}

/** Automated system / test-bot messages are never shown */
function isHumanMessage(m: SkflMessage): boolean {
  return m.sender_badge !== 'System' && m.sender_badge !== 'System Bot' && !m.content?.toLowerCase().includes('system test');
}

/**
 * Messages newer than `after` (ISO created_at), oldest → newest. Safety net that catches anything
 * a dropped realtime connection missed (backgrounded app, weak WiFi).
 */
export async function fetchMessagesAfter(after: string): Promise<SkflMessage[]> {
  const { data, error } = await retryOnClockSkew(() =>
    supabase
      .from('skfl')
      .select('*')
      .gt('created_at', after)
      .order('created_at', { ascending: true })
      .limit(MESSAGE_PAGE_SIZE)
  );

  if (error) {
    console.error('[Supabase] fetchMessagesAfter error:', error.message);
    return [];
  }
  return ((data || []) as SkflRow[]).map(rowToMessage).filter(isHumanMessage);
}

/** Insert a new message row into the skfl Supabase table (Staff human messages only) */
export async function insertMessage(
  identity: AnonymousIdentity,
  messageType: SkflMessage['message_type'],
  content: string | null,
  media?: OutgoingMedia
): Promise<SkflMessage | null> {
  // STRICT RESTRICTION: No automated or system messages allowed. Only authenticated human staff can send.
  if (
    !identity ||
    !identity.clientId ||
    identity.badge === 'System' ||
    identity.badge === 'System Bot' ||
    (content && content.toLowerCase().includes('system test verification'))
  ) {
    console.warn('[Security Restriction] Automated system messages are blocked. Only employee messages are allowed.');
    return null;
  }

  const payload = buildContent(identity, messageType, content, media);
  const { data, error } = await retryOnClockSkew(() =>
    supabase
      .from('skfl')
      .insert(payload)
      .select()
      .single()
  );

  if (error) {
    console.error('[Supabase] insertMessage error:', error.message);
    return null;
  }
  return rowToMessage(data as SkflRow);
}

export type ActionResult = { ok: true; message?: SkflMessage } | { ok: false; reason: 'schema' | 'denied' | 'expired' | 'error' };

/** A message can be edited for this long after it was sent (the database enforces the same 10 minutes). */
export const EDIT_WINDOW_MS = 10 * 60 * 1000;

/** Whether `msg` is still inside its editing window. */
export const withinEditWindow = (msg: SkflMessage, now = Date.now()) => now - Date.parse(msg.created_at) <= EDIT_WINDOW_MS;

/**
 * Edits, deletes and votes go through database functions (supabase/skfl_schema.sql) that check the
 * sender and rewrite `content` in one step. This turns their outcome into an ActionResult.
 */
export function toActionResult(what: string, data: unknown, error: { message: string; code?: string } | null): ActionResult {
  if (error) {
    console.error(`[Supabase] ${what} error:`, error.message);
    if (/edit time is over/i.test(error.message)) return { ok: false, reason: 'expired' };
    // PGRST202 / 42883 = the function does not exist yet; 42501 / P0002 = not yours, or the message is gone
    if (error.code === 'PGRST202' || error.code === '42883') return { ok: false, reason: 'schema' };
    if (error.code === '42501' || error.code === 'P0002') return { ok: false, reason: 'denied' };
    return { ok: false, reason: 'error' };
  }
  return { ok: true, message: data ? rowToMessage(data as SkflRow) : undefined };
}

/** Edit the text of one of our own messages. Everyone sees it flagged "Edited". */
export async function editMessage(msg: SkflMessage, content: string): Promise<ActionResult> {
  const { data, error } = await retryOnClockSkew(() =>
    supabase.rpc('skfl_edit_message', {
      p_id: msg.id,
      p_client_id: msg.sender_client_id,
      p_text: content,
    })
  );
  return toActionResult('editMessage', data, error);
}

/**
 * Delete one of our own messages for everyone. The row stays (so every phone can show
 * "This message was deleted") but its text and media are wiped, and the uploaded file is
 * removed from storage.
 */
export async function deleteMessageForEveryone(msg: SkflMessage): Promise<ActionResult> {
  const { data, error } = await retryOnClockSkew(() =>
    supabase.rpc('skfl_delete_message', {
      p_id: msg.id,
      p_client_id: msg.sender_client_id,
    })
  );
  const result = toActionResult('deleteMessageForEveryone', data, error);

  if (result.ok && msg.media_storage_path) {
    // Best effort: the message is already gone for everyone even if this fails
    supabase.storage.from(STORAGE_BUCKET).remove([msg.media_storage_path]).catch(() => {});
  }
  return result;
}

/**
 * Current state of the given messages (used to notice edits / deletions that a dropped
 * realtime connection missed). Returns null when the request itself failed.
 */
export async function fetchMessagesByIds(ids: string[]): Promise<SkflMessage[] | null> {
  if (ids.length === 0) return [];
  const { data, error } = await retryOnClockSkew(() =>
    supabase.from('skfl').select('*').in('id', ids)
  );
  if (error) return null;
  return ((data || []) as SkflRow[]).map(rowToMessage);
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (typeof (blob as any).arrayBuffer === 'function') {
      (blob as any).arrayBuffer()
        .then((buf: ArrayBuffer) => {
          if (buf && buf.byteLength > 0) resolve(buf);
          else readBlobViaFileReader(blob, resolve, reject);
        })
        .catch(() => readBlobViaFileReader(blob, resolve, reject));
      return;
    }
    readBlobViaFileReader(blob, resolve, reject);
  });
}

function readBlobViaFileReader(blob: Blob, resolve: (buf: ArrayBuffer) => void, reject: (err: any) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (reader.result instanceof ArrayBuffer) {
      resolve(reader.result);
    } else if (typeof reader.result === 'string') {
      const b64 = reader.result.includes(',') ? reader.result.split(',')[1] : reader.result;
      resolve(decodeBase64ToArrayBuffer(b64));
    } else {
      reject(new Error('Unable to convert blob to ArrayBuffer'));
    }
  };
  reader.onerror = (e) => reject(e || new Error('FileReader error'));
  reader.readAsDataURL(blob);
}

/** Read any local file, content:// URI, or remote URI into raw binary ArrayBuffer */
async function readFileAsArrayBuffer(fileUri: string): Promise<ArrayBuffer> {
  // If file:// on Native, try ExpoFile first
  if (Platform.OS !== 'web' && !fileUri.startsWith('content://')) {
    try {
      const file = new ExpoFile(fileUri);
      const buf = await file.arrayBuffer();
      if (buf && buf.byteLength > 0) return buf;
    } catch (_) {}
  }

  // Universal fetch (handles file://, content:// on Android, and http(s)://)
  const response = await fetch(fileUri);
  try {
    const ab = await response.arrayBuffer();
    if (ab && ab.byteLength > 0) return ab;
  } catch (_) {}

  // Fallback to blob -> ArrayBuffer
  const blob = await response.blob();
  return await blobToArrayBuffer(blob);
}

/**
 * Send one file to the Storage bucket with an XMLHttpRequest, so the upload reports how many bytes have gone
 * out (`onProgress`, 0..1). On the phone the file is streamed straight from disk (`{ uri }`) instead of being
 * loaded into memory, so big videos and documents upload fine.
 */
async function putObject(
  path: string,
  body: any,
  contentType: string,
  onProgress?: (fraction: number) => void
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? Config.SUPABASE_ANON_KEY;
  const url = `${Config.SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', Config.SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e: any) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(body);
  });
}

/** Upload a media file to Supabase Storage `skfl-media` bucket. `onProgress` gets 0..1 as the bytes go out. */
export async function uploadMediaToStorage(
  fileUri: string,
  fileName: string,
  mimeType: string,
  onProgress?: (fraction: number) => void
): Promise<{ storagePath: string; publicUrl: string; size?: number } | null> {
  try {
    // If it is already a hosted public URL, return immediately
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      return {
        storagePath: fileName,
        publicUrl: fileUri,
      };
    }

    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${cleanName}`;
    const safeMime = getSupportedMimeType(mimeType, fileName);

    let body: any;
    let byteLength: number | undefined;
    if (Platform.OS !== 'web') {
      // stream from disk; the size is known for file:// paths (picker / camera / recorder all give those)
      body = { uri: fileUri, type: safeMime, name: uniqueName };
      try {
        if (fileUri.startsWith('file://')) byteLength = new ExpoFile(fileUri).size;
      } catch (_) {}
      if (byteLength === 0) {
        console.error('[Supabase Storage] Refusing to upload an empty file:', fileName);
        return null;
      }
    } else {
      body = await readFileAsArrayBuffer(fileUri);
      byteLength = (body as ArrayBuffer).byteLength;
      if (!byteLength) {
        console.error('[Supabase Storage] Refusing to upload an empty file:', fileName);
        return null;
      }
    }

    onProgress?.(0);
    await putObject(uniqueName, body, safeMime, onProgress);

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uniqueName);

    return {
      storagePath: uniqueName,
      publicUrl: urlData.publicUrl,
      size: byteLength,
    };
  } catch (err) {
    console.error('[Supabase Storage] Upload failed exception:', err);
    return null;
  }
}

let stopActive: (() => void) | null = null;

/**
 * Live inserts, edits and deletes on the skfl table — a row added, changed or removed anywhere
 * (another phone, or straight in the Supabase table editor) reaches this phone at once.
 * The channel heals itself after a dropped connection (see realtimeChannel.ts).
 */
export function subscribeToMessages(
  onNewMessage: (msg: SkflMessage) => void,
  changes?: {
    /** A row was edited, deleted-for-everyone (soft delete) or received a vote */
    onUpdate?: (msg: SkflMessage) => void;
    /** A row was removed from the table altogether */
    onDelete?: (id: string) => void;
    /** The live connection came back after a drop — pull in anything missed meanwhile */
    onReconnect?: () => void;
  }
): () => void {
  try {
    stopActive?.(); // only one messages subscription at a time

    const stop = managedChannel(
      'skfl_sub',
      (channel) => {
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skfl' }, (payload: any) => {
          if (payload && payload.new) {
            const msg = rowToMessage(payload.new as SkflRow);
            // Security filter: drop automated system messages
            if (isHumanMessage(msg)) onNewMessage(msg);
          }
        });

        // Edits / deletions made by anyone (or straight in the Supabase table) reach every phone live
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'skfl' }, (payload: any) => {
          if (payload?.new) changes?.onUpdate?.(rowToMessage(payload.new as SkflRow));
        });
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'skfl' }, (payload: any) => {
          const id = payload?.old?.id;
          if (id) changes?.onDelete?.(id);
        });
      },
      changes?.onReconnect
    );

    stopActive = stop;
    return () => {
      stop();
      if (stopActive === stop) stopActive = null;
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Subscribe exception caught safely:', err);
    return () => {};
  }
}

/** Clear all messages from the skfl table */
export async function clearAllMessages(): Promise<boolean> {
  const { error } = await supabase
    .from('skfl')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (error) {
    console.error('[Supabase] clearAllMessages error:', error.message);
    return false;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// responses.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Poll votes and event RSVPs.
 *
 * They live inside the message itself: `skfl.content.responses` holds the total number of people who
 * responded, the count per answer and who chose what (see supabase/skfl_schema.sql). A vote is one call
 * to the `skfl_cast_response` database function, which rewrites that block; every phone then receives
 * the updated message through the normal live message updates, so there is nothing extra to subscribe to.
 */

export interface ResponseRow {
  message_id: string;
  client_id: string;
  choice: string;
}

const NO_ROWS: ResponseRow[] = [];
const rowsCache = new WeakMap<SkflResponses, ResponseRow[]>();

/** Who chose what, for the poll / event cards. Stable between renders while the votes are unchanged. */
export function responsesOf(msg: SkflMessage): ResponseRow[] {
  const r = msg.responses;
  if (!r || r.votes.length === 0) return NO_ROWS;
  let rows = rowsCache.get(r);
  if (!rows) {
    rows = r.votes.map((v) => ({ message_id: msg.id, client_id: v.client_id, choice: v.choice }));
    rowsCache.set(r, rows);
  }
  return rows;
}

/**
 * What the responses will look like once `clientId` picks `choice` (same rules as the database
 * function): picking the same answer again withdraws it, and single-answer polls / events keep one
 * answer per person. Used to update the screen instantly while the vote is being saved.
 */
export function withVote(msg: SkflMessage, clientId: string, choice: string, multi: boolean): SkflResponses {
  const cur = msg.responses ?? emptyResponses();
  const had = cur.votes.some((v) => v.client_id === clientId && v.choice === choice);

  let votes: SkflResponses['votes'];
  if (had) {
    votes = cur.votes.filter((v) => !(v.client_id === clientId && v.choice === choice));
  } else {
    const kept = multi ? cur.votes : cur.votes.filter((v) => v.client_id !== clientId);
    const label = cur.results.find((r) => r.choice === choice)?.label ?? '';
    votes = [...kept, { client_id: clientId, choice, label, at: new Date().toISOString() }];
  }

  return {
    total: new Set(votes.map((v) => v.client_id)).size,
    results: cur.results.map((r) => ({ ...r, count: votes.filter((v) => v.choice === r.choice).length })),
    votes,
  };
}

/** Save `clientId`'s pick (or withdrawal) on a poll / event message. */
export async function castResponse(messageId: string, clientId: string, choice: string): Promise<ActionResult> {
  const { data, error } = await retryOnClockSkew(() =>
    supabase.rpc('skfl_cast_response', {
      p_id: messageId,
      p_client_id: clientId,
      p_choice: choice,
    })
  );
  return toActionResult('castResponse', data, error);
}

// ════════════════════════════════════════════════════════════════════════════
// typing.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Live "typing…" indicator.
 *
 * Uses a Supabase Realtime *broadcast* channel: events go straight from phone to phone,
 * nothing is stored, and no database tables are needed. Every device joins the same
 * topic; a device broadcasts while its user is typing and receivers show an indicator
 * that expires on its own if the sender goes quiet (closed app, lost signal…).
 */

export interface Typer {
  clientId: string;
  badge: string;
  avatarColor: string;
}

const TOPIC = 'skfl_typing';
const EXPIRE_MS = 4000;      // hide a typer this long after their last "typing" ping
const PING_EVERY_MS = 2500;  // while typing, re-announce at most this often

export interface TypingSession {
  /** Call on every keystroke burst (true) and when the box empties / a message is sent (false). */
  setTyping: (typing: boolean) => void;
  leave: () => void;
}

export function joinTyping(me: Typer, onChange: (typers: Typer[]) => void): TypingSession {
  const active = new Map<string, { typer: Typer; timer: any }>();
  let channel: any = null;
  let subscribed = false;
  let lastPing = 0;
  let iAmTyping = false;

  const emit = () => onChange(Array.from(active.values()).map((v) => v.typer));

  const drop = (clientId: string) => {
    const entry = active.get(clientId);
    if (!entry) return;
    clearTimeout(entry.timer);
    active.delete(clientId);
    emit();
  };

  try {
    channel = supabase.channel(TOPIC, { config: { broadcast: { self: false } } });

    channel.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      if (!payload || payload.clientId === me.clientId) return;
      if (payload.typing === false) {
        drop(payload.clientId);
        return;
      }
      const existing = active.get(payload.clientId);
      if (existing) clearTimeout(existing.timer);
      active.set(payload.clientId, {
        typer: { clientId: payload.clientId, badge: payload.badge, avatarColor: payload.avatarColor },
        timer: setTimeout(() => drop(payload.clientId), EXPIRE_MS),
      });
      emit();
    });

    channel.subscribe((status: string) => {
      subscribed = status === 'SUBSCRIBED';
    });
  } catch (err) {
    console.warn('[Typing] join failed safely:', err);
  }

  const send = (typing: boolean) => {
    if (!channel || !subscribed) return;
    channel
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { clientId: me.clientId, badge: me.badge, avatarColor: me.avatarColor, typing },
      })
      .catch(() => {});
  };

  return {
    setTyping(typing: boolean) {
      if (typing) {
        const now = Date.now();
        if (!iAmTyping || now - lastPing >= PING_EVERY_MS) {
          iAmTyping = true;
          lastPing = now;
          send(true);
        }
      } else if (iAmTyping) {
        iAmTyping = false;
        lastPing = 0;
        send(false);
      }
    },
    leave() {
      active.forEach((v) => clearTimeout(v.timer));
      active.clear();
      try {
        if (iAmTyping) send(false);
        if (channel) supabase.removeChannel(channel);
      } catch (e) {}
      channel = null;
    },
  };
}
