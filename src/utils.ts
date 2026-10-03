import { useFonts } from 'expo-font';
import { Tinos_700Bold } from '@expo-google-fonts/tinos/700Bold';


// ════════════════════════════════════════════════════════════════════════════
// formatters.ts
// ════════════════════════════════════════════════════════════════════════════

export function formatTime(ts?: string | number | Date | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function fileExtension(name?: string | null): string {
  if (!name) return 'FILE';
  const ext = name.split('.').pop();
  return ext ? ext.toUpperCase() : 'FILE';
}

export const getFileExtension = fileExtension;


const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Local calendar-day key, e.g. "2026-9-26" — used to group messages by day. */
export function dayKey(ts: string | number | Date): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** WhatsApp-style day label: "Today", "Yesterday", otherwise "24 September 2026". */
export function dayLabel(ts: string | number | Date, now: Date = new Date()): string {
  const d = new Date(ts);
  const key = dayKey(d);
  if (key === dayKey(now)) return 'Today';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === dayKey(yesterday)) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatFullDateTime(ts?: string | number | Date | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${dayLabel(d)}, ${formatTime(d.getTime())}`;
}

// ════════════════════════════════════════════════════════════════════════════
// emoji.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Emoji-only messages are shown bigger, WhatsApp style: the fewer the emojis, the bigger each one.
 * Written with plain code-point ranges (no Unicode property escapes / Intl.Segmenter) so it runs on Hermes.
 */

const isSkinTone = (cp: number) => cp >= 0x1f3fb && cp <= 0x1f3ff;
const isTag = (cp: number) => cp >= 0xe0020 && cp <= 0xe007f; // flag subdivisions (🏴 England …)
const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;

/** Joiners and modifiers that ride along with the emoji before them */
const isModifier = (cp: number) => cp === 0xfe0f || cp === 0x20e3 || isSkinTone(cp) || isTag(cp);

const SINGLES = new Set([0xa9, 0xae, 0x203c, 0x2049, 0x2122, 0x2139, 0x24c2, 0x25aa, 0x25ab, 0x25b6, 0x25c0, 0x3030, 0x303d, 0x3297, 0x3299]);

const isEmojiBase = (cp: number) =>
  (cp >= 0x1f000 && cp <= 0x1faff) || // pictographs, emoticons, transport, symbols, food, gestures …
  (cp >= 0x2600 && cp <= 0x27bf) ||   // ☀ ☎ ✅ ✨ ❤ …
  (cp >= 0x2300 && cp <= 0x23ff) ||   // ⌚ ⏰ ⏳ …
  (cp >= 0x2b00 && cp <= 0x2bff) ||   // ⭐ ⬛ …
  (cp >= 0x2934 && cp <= 0x2935) ||
  SINGLES.has(cp);

/**
 * How many emojis the text is made of, or 0 when it holds anything else (letters, digits, punctuation…)
 * or nothing at all. Spaces between emojis are allowed. A flag, a skin-toned hand or a family (joined with
 * zero-width joiners) counts as one.
 */
export function emojiOnlyCount(text: string | null | undefined): number {
  if (!text) return 0;
  let count = 0;
  let afterJoiner = false;
  let flagHalf = false;

  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;

    if (/\s/.test(ch)) {
      afterJoiner = false;
      flagHalf = false;
    } else if (isModifier(cp)) {
      if (count === 0) return 0;
    } else if (cp === 0x200d) {
      if (count === 0) return 0;
      afterJoiner = true;
    } else if (isRegionalIndicator(cp)) {
      if (flagHalf) {
        flagHalf = false; // second half of a flag
      } else {
        count++;
        flagHalf = true;
      }
      afterJoiner = false;
    } else if (isEmojiBase(cp)) {
      if (!afterJoiner) count++; // a joined emoji (👨‍👩‍👧) is part of the one before it
      afterJoiner = false;
      flagHalf = false;
    } else {
      return 0;
    }
  }
  return count;
}

/** Font size for an emoji-only message of `count` emojis; null = show it as normal text. */
export function emojiFontSize(count: number): number | null {
  if (count < 1 || count > 8) return null;
  // 1 → 52px, 2 → 40px, 3 → 30px, 4–8 → all 20px (same)
  return [0, 52, 40, 30, 20, 20, 20, 20, 20][count];
}

// ════════════════════════════════════════════════════════════════════════════
// fonts.ts
// ════════════════════════════════════════════════════════════════════════════

// Only this one weight, so the app doesn't bundle the whole family

/**
 * The header title's typeface: Times New Roman (Bold). Times New Roman itself is not installed on Android phones, so
 * this is Tinos — the free font drawn to match Times New Roman letter for letter — bundled with the app so the header
 * looks the same on every phone. Header title only; no other font is used for it.
 */
export const HEADER_FONT = 'Tinos_700Bold';

/** True once the header font is ready; until then the header keeps the system font (no flash of a missing font). */
export function useHeaderFont(): boolean {
  const [loaded] = useFonts({ [HEADER_FONT]: Tinos_700Bold });
  return loaded;
}
