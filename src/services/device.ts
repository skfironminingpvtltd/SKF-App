import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnonymousIdentity, previewText, SkflMessage } from './chat';
import { Platform, AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from './supabase';


// ════════════════════════════════════════════════════════════════════════════
// identity.ts
// ════════════════════════════════════════════════════════════════════════════

const KEYS = {
  CLIENT_ID: '@skfl_client_id',
  ALL_CLIENT_IDS: '@skfl_all_my_client_ids',
  SENT_MSG_IDS: '@skfl_sent_msg_ids',
  BADGE: '@skfl_badge',
  COLOR: '@skfl_color',
};

export const SELF_ANON_COLOR = '#2FD06B';
export const OTHER_ANON_COLOR = '#A855F7';

let _cached: AnonymousIdentity | null = null;
let _cachedClientIds: Set<string> | null = null;
let _cachedSentIds: Set<string> | null = null;

// Read persistent ID from disk file (survives Metro restart, Expo Go reloads, JS refreshes)
async function readDiskFile(fileName: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { File, Paths } = require('expo-file-system');
    if (Paths?.document) {
      const f = new File(Paths.document, fileName);
      if (f.exists) {
        const text = await f.text();
        if (text && text.trim()) return text.trim();
      }
    }
  } catch (_) {}
  try {
    const FileSystem = require('expo-file-system/legacy');
    if (FileSystem?.documentDirectory) {
      const path = FileSystem.documentDirectory + fileName;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(path);
        if (text && text.trim()) return text.trim();
      }
    }
  } catch (_) {}
  return null;
}

// Write persistent ID to disk file
async function writeDiskFile(fileName: string, content: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { File, Paths } = require('expo-file-system');
    if (Paths?.document) {
      const f = new File(Paths.document, fileName);
      await f.write(content);
      return;
    }
  } catch (_) {}
  try {
    const FileSystem = require('expo-file-system/legacy');
    if (FileSystem?.documentDirectory) {
      const path = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(path, content);
    }
  } catch (_) {}
}

export async function getAllMyClientIds(): Promise<Set<string>> {
  if (_cachedClientIds && _cachedClientIds.size > 0) return _cachedClientIds;
  const ids = new Set<string>();
  try {
    const raw = await AsyncStorage.getItem(KEYS.ALL_CLIENT_IDS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((id) => id && ids.add(String(id)));
    }
  } catch (_) {}
  try {
    const diskRaw = await readDiskFile('skfl_all_client_ids.json');
    if (diskRaw) {
      const arr = JSON.parse(diskRaw);
      if (Array.isArray(arr)) arr.forEach((id) => id && ids.add(String(id)));
    }
  } catch (_) {}
  _cachedClientIds = ids;
  return ids;
}

export async function markClientIdAsMine(clientId: string): Promise<void> {
  if (!clientId) return;
  const ids = await getAllMyClientIds();
  if (!ids.has(clientId)) {
    ids.add(clientId);
    _cachedClientIds = ids;
    const json = JSON.stringify(Array.from(ids));
    AsyncStorage.setItem(KEYS.ALL_CLIENT_IDS, json).catch(() => {});
    writeDiskFile('skfl_all_client_ids.json', json).catch(() => {});
  }
}

export async function getSentMessageIds(): Promise<Set<string>> {
  if (_cachedSentIds && _cachedSentIds.size > 0) return _cachedSentIds;
  const ids = new Set<string>();
  try {
    const raw = await AsyncStorage.getItem(KEYS.SENT_MSG_IDS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((id) => id && ids.add(String(id)));
    }
  } catch (_) {}
  _cachedSentIds = ids;
  return ids;
}

export async function markMessageAsSentByMe(msgId: string): Promise<void> {
  if (!msgId) return;
  const ids = await getSentMessageIds();
  if (!ids.has(msgId)) {
    ids.add(msgId);
    _cachedSentIds = ids;
    // Keep newest 3000 ids
    const list = Array.from(ids).slice(-3000);
    AsyncStorage.setItem(KEYS.SENT_MSG_IDS, JSON.stringify(list)).catch(() => {});
  }
}

export function isOwnMessage(
  msg: Pick<SkflMessage, 'id' | 'sender_client_id'>,
  currentClientId?: string | null,
  knownClientIds?: Set<string>,
  sentMsgIds?: Set<string>
): boolean {
  if (!msg) return false;
  if (msg.id && msg.id.startsWith('opt_')) return true;
  if (currentClientId && msg.sender_client_id && msg.sender_client_id === currentClientId) return true;
  if (_cached?.clientId && msg.sender_client_id && msg.sender_client_id === _cached.clientId) return true;

  const known = knownClientIds || _cachedClientIds;
  if (known && msg.sender_client_id && known.has(msg.sender_client_id)) return true;

  const sent = sentMsgIds || _cachedSentIds;
  if (sent && msg.id && sent.has(msg.id)) return true;

  return false;
}

export async function getIdentity(): Promise<AnonymousIdentity> {
  if (_cached) {
    if (_cached.clientId) {
      markClientIdAsMine(_cached.clientId).catch(() => {});
    }
    return _cached;
  }

  // Layer 1: Check AsyncStorage
  let clientId: string | null = null;
  try {
    clientId = await AsyncStorage.getItem(KEYS.CLIENT_ID);
  } catch (_) {}

  // Layer 2: Check persistent disk file (survives app reload / Metro / Expo Go cache clears)
  if (!clientId) {
    clientId = await readDiskFile('skfl_client_id.txt');
  }

  // Layer 3: Check known client IDs from previous sessions on this device
  if (!clientId) {
    const known = await getAllMyClientIds();
    if (known.size > 0) {
      // Use the last recorded client ID for this device
      const arr = Array.from(known);
      clientId = arr[arr.length - 1];
    }
  }

  // If still none, generate a new stable client ID
  if (!clientId) {
    clientId = 'anon_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
  }

  // Persist across all storage layers so it NEVER gets lost on reload
  await Promise.all([
    AsyncStorage.setItem(KEYS.CLIENT_ID, clientId).catch(() => {}),
    writeDiskFile('skfl_client_id.txt', clientId).catch(() => {}),
    markClientIdAsMine(clientId),
  ]);

  let badge = await AsyncStorage.getItem(KEYS.BADGE).catch(() => null);
  if (!badge || badge.startsWith('Anon-') || badge !== 'Anonymous') {
    badge = 'Anonymous';
    await AsyncStorage.setItem(KEYS.BADGE, badge).catch(() => {});
  }

  // Self is always the current green color
  const color = SELF_ANON_COLOR;
  await AsyncStorage.setItem(KEYS.COLOR, color).catch(() => {});

  _cached = { clientId, badge, avatarColor: color };
  return _cached;
}

export async function regenerateIdentity(): Promise<AnonymousIdentity> {
  await AsyncStorage.multiRemove([KEYS.BADGE, KEYS.COLOR]).catch(() => {});
  _cached = null;
  return getIdentity();
}

export const AVATAR_COLORS = [SELF_ANON_COLOR, OTHER_ANON_COLOR];
export const regenerateAnonymousIdentity = regenerateIdentity;
export const getAnonymousIdentity = getIdentity;

// ════════════════════════════════════════════════════════════════════════════
// hiddenMessages.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * "Delete for me": message ids this phone has hidden. Purely local, so nothing changes
 * for anyone else, and the ids survive app restarts.
 */
const KEY = '@skfl_hidden_message_ids';
const MAX_KEPT = 2000;

export async function loadHiddenIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch (e) {
    return new Set();
  }
}

export async function saveHiddenIds(ids: Set<string>): Promise<void> {
  try {
    // Keep the newest entries if the list ever grows huge
    const list = Array.from(ids).slice(-MAX_KEPT);
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════════════
// permissions.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * First launch only: ask for everything the app can use, one system dialog after another
 * (microphone, camera, photos, contacts). Notifications are asked afterwards by
 * `startNotifications`. Later, every feature simply works without asking again; if a permission
 * was denied, that feature asks again at the moment it is used.
 */
export async function requestFirstLaunchPermissions(): Promise<void> {
  if (Platform.OS === 'web') return;

  const steps: Array<() => Promise<unknown>> = [
    () => requestRecordingPermissionsAsync(),
    () => ImagePicker.requestCameraPermissionsAsync(),
    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
    async () => {
      const Contacts = require('expo-contacts/legacy');
      return Contacts.requestPermissionsAsync();
    },
  ];

  for (const step of steps) {
    try {
      await step();
    } catch (e) {
      console.warn('[Permissions] request failed:', e);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// notifications.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Message notifications, the way every messenger does them:
 *   - the phone registers an Expo push token with Supabase (skfl_push_tokens)
 *   - a database trigger (supabase/skfl_push_notifications.sql) pushes every new message to
 *     every OTHER registered phone, so it arrives even when the app is closed
 *   - while the app is open there is no banner (the chat itself shows the message)
 *
 * Remote push needs a real build (EAS development build or release APK/IPA). In Expo Go on
 * Android notifications are switched off entirely — the package can't even be loaded there.
 */

const CHANNEL_ID = 'messages';
const TOKEN_KEY = '@skfl_push_token';
const TITLE = 'SKF Iron & Mining Pvt Ltd Team'; // same name as the chat header

const inExpoGoAndroid =
  Platform.OS === 'android' &&
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as any).appOwnership === 'expo');

const supported = Platform.OS !== 'web' && !inExpoGoAndroid;

let cached: typeof import('expo-notifications') | null = null;
let loadAttempted = false;

function notif(): typeof import('expo-notifications') | null {
  if (inExpoGoAndroid || !supported) return null;
  if (!cached && !loadAttempted) {
    loadAttempted = true;
    try {
      cached = require('expo-notifications');
    } catch (e: any) {
      console.log('[Notifications] Push notifications require a production APK or development build on Android.');
      cached = null;
    }
  }
  return cached;
}

let remoteActive = false;
let started = false;
let appStateSub: { remove: () => void } | null = null;
let warned = false;

function warnOnce(msg: string) {
  if (warned) return;
  warned = true;
  console.log(`[Notifications] ${msg}`);
}

if (supported) {
  try {
    const N = notif();
    if (N?.setNotificationHandler) {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (_) {}
}

/** "Photo", "Voice message"… — the one-line body used in notifications. */
export function messagePreview(m: Pick<SkflMessage, 'message_type' | 'content' | 'media_original_name'>): string {
  switch (m.message_type) {
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎬 Video';
    case 'audio':
      return '🎤 Voice message';
    case 'file':
      return `📄 ${m.media_original_name || 'Document'}`;
    default: {
      const t = previewText(m.content).trim(); // polls / events / contacts are stored as JSON text
      return t.length > 140 ? `${t.slice(0, 140)}…` : t || 'New message';
    }
  }
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    const N = notif();
    if (!N?.setNotificationChannelAsync) return;
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Team messages',
      description: 'New messages in the SKF team chat',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#D4AF37',
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  } catch (e) {
    console.warn('[Notifications] ensureChannel error:', e);
  }
}

async function ensurePermission(): Promise<boolean> {
  try {
    const N = notif();
    if (!N?.getPermissionsAsync) return false;
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return asked.granted;
  } catch (e) {
    console.warn('[Notifications] ensurePermission error:', e);
    return false;
  }
}

async function registerPushToken(clientId: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('[Notifications] Push tokens require a physical device.');
    return;
  }

  try {
    const N = notif();
    if (!N?.getExpoPushTokenAsync) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.projectId;

    let token: string | null = null;
    try {
      if (projectId) {
        const res = await N.getExpoPushTokenAsync({ projectId });
        token = res?.data;
      } else {
        const res = await N.getExpoPushTokenAsync();
        token = res?.data;
      }
    } catch (tokenErr: any) {
      console.log('[Notifications] Push token note (local notifications active):', tokenErr?.message || tokenErr);
    }

    if (token) {
      const { error } = await supabase.rpc('skfl_register_push_token', {
        p_token: token,
        p_client_id: clientId,
        p_platform: Platform.OS,
      });
      if (error) {
        console.warn(`[Notifications] Could not save push token: ${error.message}`);
      } else {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        remoteActive = true;
        console.log('[Notifications] Push token registered with Supabase successfully');
      }
    }
  } catch (err: any) {
    console.log('[Notifications] registerPushToken error:', err?.message || err);
  }
}

/** Call once after sign-in (idempotent). Asks for permission, creates the channel, registers the phone. */
export async function startNotifications(identity: { clientId: string }): Promise<void> {
  if (!supported || started) {
    if (inExpoGoAndroid) {
      warnOnce('Push notifications are configured for production builds (APK / EAS Build). Remote push notifications are disabled in Expo Go on Android by Expo SDK 53.');
    }
    return;
  }
  started = true;
  try {
    await ensureChannel();
    const granted = await ensurePermission();
    if (!granted) {
      console.log('[Notifications] Notification permission not granted yet.');
    }
    await registerPushToken(identity.clientId);
  } catch (err: any) {
    console.warn('[Notifications] Setup error:', err?.message || err);
  }

  // Coming back to the app clears the notifications and the badge, like WhatsApp does
  const clear = () => {
    try {
      const N = notif();
      N?.dismissAllNotificationsAsync?.().catch(() => {});
      N?.setBadgeCountAsync?.(0).catch(() => {});
    } catch (_) {}
  };
  clear();
  appStateSub?.remove();
  appStateSub = AppState.addEventListener('change', (s) => {
    if (s === 'active') clear();
  });
}

/** Call on sign-out: this phone stops receiving alerts for a chat it can no longer open. */
export async function stopNotifications(): Promise<void> {
  if (!supported) return;
  appStateSub?.remove();
  appStateSub = null;
  started = false;
  remoteActive = false;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await supabase.rpc('skfl_unregister_push_token', { p_token: token });
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    const N = notif();
    await N?.dismissAllNotificationsAsync?.();
    await N?.setBadgeCountAsync?.(0);
  } catch {
    // best effort
  }
}

/**
 * Deliver a notification when a new message arrives from another participant.
 * If the app is in the background or minimized, immediately posts a system notification with sound and vibration.
 */
export async function notifyBackgroundMessage(msg: SkflMessage, force: boolean = false): Promise<void> {
  if (!supported) return;
  try {
    const isBackground = AppState.currentState !== 'active';
    // If remote push is already confirmed active and the app is in background, the server already sent it
    if (remoteActive && isBackground) return;

    // Do not notify for empty or own messages
    if (!msg || !msg.id) return;

    await ensureChannel();
    const N = notif();
    if (!N?.scheduleNotificationAsync) return;

    await N.scheduleNotificationAsync({
      content: {
        title: TITLE,
        body: `Anonymous: ${messagePreview(msg)}`,
        sound: 'default',
        data: { messageId: msg.id },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch (err) {
    console.warn('[Notifications] scheduleNotificationAsync error:', err);
  }
}

/**
 * Test notification helper: triggers an immediate notification to verify audio, banner, and vibration.
 */
export async function testNotification(): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannel();
    await ensurePermission();
    const N = notif();
    if (!N?.scheduleNotificationAsync) return false;
    await N.scheduleNotificationAsync({
      content: {
        title: TITLE,
        body: 'Notifications are working properly!',
        sound: 'default',
        data: { test: true },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
    return true;
  } catch (err) {
    console.warn('[Notifications] testNotification error:', err);
    return false;
  }
}
