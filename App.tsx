import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    Image,
    ScrollView,
    Platform,
    ActivityIndicator,
    Animated,
    Dimensions,
    useWindowDimensions,
    StatusBar,
    Easing,
    Keyboard,
    AppState,
    Pressable,
    BackHandler,
    PanResponder,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Circle as SvgCircle, Path as SvgPath, Rect as SvgRect, Line as SvgLine } from 'react-native-svg';
import * as SystemUI from 'expo-system-ui';
import * as Haptics from 'expo-haptics';
import { ChatBackdrop, AnimatedGradientText } from './src/components/Brand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import {
    safeAudio,
    AudioPlaybackState,
    downloadAndOpen,
    setUploadProgress,
    clearUploadProgress,
    useUploadProgress,
    useMediaState,
    needsDownload,
    downloadMedia,
    openInPhone,
    getMediaState,
    markMediaReady,
    cacheSenderMedia,
    MediaState,
} from './src/services/media';
import { AuthGate } from './src/components/Auth';
import {
    startNotifications,
    notifyBackgroundMessage,
    getIdentity,
    SELF_ANON_COLOR,
    OTHER_ANON_COLOR,
    requestFirstLaunchPermissions,
    loadHiddenIds,
    saveHiddenIds,
    getAllMyClientIds,
    getSentMessageIds,
    markMessageAsSentByMe,
    markClientIdAsMine,
    isOwnMessage,
} from './src/services/device';
import {
    CheckCheck,
    Clock,
    DeleteIcon,
    Play,
    Pause,
    BanIcon,
    CloseIcon,
    ArrowLeft,
    MoreVertical,
    PinActionIcon,
    CheckmarkIcon,
    DownloadIcon,
    WaSendIcon,
    WaMicIcon,
    WaAttachIcon,
    CameraOutlineIcon,
    KeyboardIcon,
    SmileyIcon,
} from './src/components/Icons';
import {
    SkflMessage,
    AnonymousIdentity,
    joinTyping,
    Typer,
    TypingSession,
    parseRich,
    encodeRich,
    RichPayload,
    previewText,
    getMessageSnippet,
    ResponseRow,
    responsesOf,
    withVote,
    castResponse,
    fetchMessagesPage,
    fetchMessagesAfter,
    fetchMessagesByIds,
    editMessage,
    withinEditWindow,
    deleteMessageForEveryone,
    insertMessage,
    uploadMediaToStorage,
    subscribeToMessages,
    clearAllMessages,
} from './src/services/chat';
import {
    AttachMenu,
    EmojiPanel,
    DownloadRing,
    VoiceRecorderPanel,
    PollComposer,
    EventComposer,
} from './src/components/ChatSheets';
import { PollCard, EventCard, ContactCard } from './src/components/RichCards';
import {
    HEADER_FONT,
    useHeaderFont,
    emojiOnlyCount,
    emojiFontSize,
    formatTime,
    formatFileSize,
    formatDuration,
    fileExtension,
    dayKey,
    dayLabel,
} from './src/utils';


export interface StagedMedia {
    uri: string;
    fileName: string;
    mimeType: string;
    type: SkflMessage['message_type'];
    extras?: { width?: number; height?: number; durationMs?: number; size?: number };
}

const { width: SW, height: SH } = Dimensions.get('window');

// ──────────────────── ZERO-DEPENDENCY LINEAR GRADIENT ────────────────────
function LinearGradient({ colors, style, children, ...props }: any) {
    const bg = colors && colors.length > 0 ? colors[0] : 'transparent';
    if (Platform.OS === 'web' && colors && colors.length > 1) {
        return (
            <View
                style={[
                    style,
                    {
                        // @ts-ignore
                        backgroundImage: `linear-gradient(135deg, ${colors.join(', ')})`,
                    },
                ]}
                {...props}
            >
                {children}
            </View>
        );
    }
    return (
        <View style={[style, { backgroundColor: bg }]} {...props}>
            {children}
        </View>
    );
}

function PhotoOutlineIcon({ size = 15, color = '#8696A0' }: { size?: number; color?: string }) {
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <SvgRect x="3" y="3" width="18" height="18" rx="3" />
                <SvgCircle cx="8.5" cy="8.5" r="1.5" fill={color} />
                <SvgPath d="m21 15-5-5L5 21" />
            </Svg>
        </View>
    );
}

function VideoOutlineIcon({ size = 15, color = '#8696A0' }: { size?: number; color?: string }) {
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <SvgRect x="2" y="5" width="14" height="14" rx="2.5" />
                <SvgPath d="m16 10 5-3.5v11L16 14v-4z" />
            </Svg>
        </View>
    );
}

function AudioOutlineIcon({ size = 15, color = '#8696A0' }: { size?: number; color?: string }) {
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <SvgPath d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <SvgPath d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <SvgLine x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
            </Svg>
        </View>
    );
}

function FileOutlineIcon({ size = 15, color = '#8696A0' }: { size?: number; color?: string }) {
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <SvgPath d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <SvgPath d="M14 2v6h6" />
            </Svg>
        </View>
    );
}

// ──────────────────── PROFESSIONAL ENTERPRISE THEME ────────────────────
const DARK = {
    bg: '#0A0E13',
    headerBg: '#101720',
    headerText: '#FFFFFF',
    headerSub: '#2FD06B',
    outBubble: '#1B2633',
    outText: '#F0F4F8',
    inBubble: '#121820',
    inText: '#E2E8F0',
    inputBg: '#121922',
    inputText: '#F0F4F8',
    placeholder: '#7E8F9F',
    accent: '#20C65A',
    accentDark: '#128C4A',
    accentGold: '#6EE7A0',
    card: '#101720',
    border: 'rgba(255, 255, 255, 0.08)',
    danger: '#EF4444',
    tsOut: '#7E8F9F',
    tsIn: '#7E8F9F',
    tickSent: '#8696A0',
    tickRead: '#53BDEB',
    overlay: 'rgba(0,0,0,0.8)',
    codeBg: '#080C10',
    codeText: '#6EE7A0',
    shadow: '#000',
};


type ChatListItem =
    | { kind: 'date'; key: string; label: string }
    | { kind: 'msg'; key: string; msg: SkflMessage; first: boolean; last: boolean };

// ──────────────────── HELPERS ────────────────────
function hap() {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
}

function getBubbleMaxWidth() {
    const w = Dimensions.get('window').width;
    return Math.min(w * 0.78, 460);
}

// ──────────────────── PREMIUM CHAT ENVIRONMENT WALLPAPER ────────────────────
// A near-invisible, brand-true diamond doodle tiled behind the message list —
// the same jewel motif from the SKF divider, echoed as ambient texture instead
// of a flat, lifeless background (the WhatsApp-style "wallpaper" treatment).


// ──────────────────── AUDIO PLAYER BUBBLE ────────────────────
const WAVE_BARS = 34;
const AUDIO_GREEN = '#20C65A'; // the played part of a voice note, like WhatsApp

// Stable, message-specific waveform silhouette (so every voice note has its own "shape")
function waveShape(seedStr: string): number[] {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    const rand = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const phase = rand() * 6.28;
    return Array.from({ length: WAVE_BARS }, (_, i) => {
        const swell = 0.5 + 0.5 * Math.sin(i * 0.55 + phase);
        return 0.28 + 0.72 * (0.35 * swell + 0.65 * rand());
    });
}

// WhatsApp-style upload ring: a dark disc with a green ring that fills as the file goes out
function UploadRing({ progress, size = 58 }: { progress: number; size?: number }) {
    const stroke = 3.5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.max(0.04, Math.min(1, progress)); // always a sliver, so it visibly starts
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Uploading ${Math.round(progress * 100)}%`}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(11, 15, 20, 0.72)' }} />
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
                <SvgCircle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={AUDIO_GREEN} strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - p)}
                />
            </Svg>
            <Svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
                <SvgPath d="M12 19V5M5.5 11.5 12 5l6.5 6.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        </View>
    );
}

function AudioPlayerBubble({ url, durationMs, theme, download = null, upload }: {
    url: string; durationMs?: number | null; isSelf: boolean; theme: typeof DARK;
    /** set while the voice note is not on this phone yet: the play button becomes a download button */
    download?: { state: MediaState; sizeText: string; onPress: () => void } | null;
    /** 0..1 while this voice note is being sent: the play button becomes the upload ring */
    upload?: number;
}) {
    const [st, setSt] = useState<AudioPlaybackState>({ isPlaying: false, positionMs: 0, durationMs: durationMs || 0 });
    const [waveW, setWaveW] = useState(0);
    const shape = useMemo(() => waveShape(url), [url]);

    const onStatus = useCallback((s: AudioPlaybackState) => {
        setSt((prev) => ({ ...s, durationMs: s.durationMs > 0 ? s.durationMs : prev.durationMs }));
    }, []);

    // Re-attach if this note is already the active one (bubble scrolled away and came back)
    useEffect(() => {
        safeAudio.subscribe(url, onStatus);
        return () => safeAudio.unsubscribe(url, onStatus);
    }, [url, onStatus]);

    const total = st.durationMs || durationMs || 0;
    const pos = Math.min(st.positionMs, total || st.positionMs);
    const frac = total > 0 ? Math.min(1, pos / total) : 0;
    const started = st.isPlaying || pos > 0;

    const toggle = async () => {
        if (upload !== undefined) return;
        hap();
        if (download) {
            if (download.state.status !== 'downloading') download.onPress();
            return;
        }
        if (st.isPlaying) {
            await safeAudio.pause();
        } else {
            setSt((p) => ({ ...p, error: false }));
            await safeAudio.play(url, onStatus);
        }
    };

    // Tap the waveform to jump to that point (or start playing if it hasn't started yet)
    const onWaveTap = (e: any) => {
        if (download) {
            toggle();
            return;
        }
        if (!started || total <= 0 || waveW <= 0) {
            toggle();
            return;
        }
        const f = Math.max(0, Math.min(1, e.nativeEvent.locationX / waveW));
        safeAudio.seekTo(f * total);
    };

    // Bare play icon (no coloured circle); the played part of the wave turns green as it runs
    const iconColor = '#E6EDF3';
    const playedColor = AUDIO_GREEN;
    const idleColor = 'rgba(255,255,255,0.32)';
    const headIdx = frac * WAVE_BARS;

    return (
        <View style={styles.audioRow}>
            {/* Play / pause: just the icon, big */}
            <TouchableOpacity
                onPress={toggle}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                accessibilityLabel={download ? 'Download voice note' : st.isPlaying ? 'Pause voice note' : 'Play voice note'}
            >
                <View style={styles.audioPlayWrap}>
                    {upload !== undefined ? (
                        <UploadRing progress={upload} size={40} />
                    ) : download ? (
                        download.state.status === 'downloading' ? (
                            <DownloadRing progress={download.state.progress} size={40} />
                        ) : (
                            <DownloadIcon size={30} color={iconColor} />
                        )
                    ) : st.loading && !st.isPlaying ? (
                        <ActivityIndicator size="small" color={iconColor} />
                    ) : st.isPlaying ? (
                        <Pause size={34} color={iconColor} />
                    ) : (
                        <Play size={34} color={iconColor} />
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.audioWaveWrap}>
                {/* Waveform: played part in gold, the bars around the playhead dance while playing */}
                <TouchableOpacity activeOpacity={1} onPress={onWaveTap} onLayout={(e) => setWaveW(e.nativeEvent.layout.width)}>
                    <View style={styles.audioBars} pointerEvents="none">
                        {shape.map((h, i) => {
                            const near = st.isPlaying ? Math.max(0, 1 - Math.abs(i + 0.5 - headIdx) / 4) : 0;
                            const wobble = near * 0.45 * Math.sin(pos / 65 + i * 1.3);
                            const height = 5 + h * 22 * (1 + wobble);
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.audioBar,
                                        { height, backgroundColor: i + 1 <= headIdx + 0.5 ? playedColor : idleColor },
                                    ]}
                                />
                            );
                        })}
                    </View>
                    {started && (
                        <View
                            pointerEvents="none"
                            style={[styles.audioHead, { left: `${frac * 100}%`, backgroundColor: AUDIO_GREEN }]}
                        />
                    )}
                </TouchableOpacity>

                {/* One time only: the note's length, counting down while it plays (no minus sign, nothing on the right) */}
                <View style={styles.audioMeta}>
                    <Text style={[styles.audioTime, { color: theme.placeholder }]}>
                        {formatDuration(download || !started ? total : Math.max(0, total - pos))}
                    </Text>
                    {download ? (
                        <Text style={[styles.audioTime, { color: theme.placeholder }]}>
                            {download.state.status === 'downloading'
                                ? `${Math.round(download.state.progress * 100)}%  ·  ${download.sizeText}`
                                : download.state.status === 'error'
                                    ? 'Failed · tap to retry'
                                    : download.sizeText}
                        </Text>
                    ) : st.error ? (
                        <Text style={[styles.audioTime, { color: theme.danger }]}>Can't play · tap to retry</Text>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

// Someone else's photo / video before it is downloaded: shows a dull/blurred WhatsApp-style preview
// with a dark circular download button and file size badge in the center.
function DownloadTile({
    width,
    height,
    bottomLeftRadius,
    bottomRightRadius,
    isVideo,
    sizeText,
    state,
    previewUri,
    onPress,
    onLongPress,
}: {
    width: number;
    height: number;
    bottomLeftRadius: number;
    bottomRightRadius: number;
    isVideo: boolean;
    sizeText: string;
    state: MediaState;
    previewUri?: string | null;
    onPress: () => void;
    onLongPress: () => void;
}) {
    const downloading = state.status === 'downloading';
    const isError = state.status === 'error';
    const label = downloading
        ? `Downloading  ·  ${sizeText}`
        : isError
            ? 'Failed · tap to retry'
            : `${isVideo ? '🎬  ' : ''}${sizeText}`;

    const hasImagePreview = !isVideo && !!previewUri;

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={280}
            activeOpacity={0.88}
            accessibilityLabel={isVideo ? 'Download video' : 'Download photo'}
            style={[
                styles.dlTile,
                {
                    width,
                    height,
                    borderTopLeftRadius: 14,
                    borderTopRightRadius: 14,
                    borderBottomLeftRadius: bottomLeftRadius,
                    borderBottomRightRadius: bottomRightRadius,
                    backgroundColor: '#121A23',
                },
            ]}
        >
            {/* WhatsApp-Style Dull / Blurred Image Preview */}
            {hasImagePreview ? (
                <Image
                    source={{ uri: previewUri || '' }}
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            width,
                            height,
                            borderTopLeftRadius: 14,
                            borderTopRightRadius: 14,
                            borderBottomLeftRadius: bottomLeftRadius,
                            borderBottomRightRadius: bottomRightRadius,
                        },
                    ]}
                    resizeMode="cover"
                    resizeMethod="auto"
                    blurRadius={Platform.OS === 'android' ? 14 : 18}
                />
            ) : isVideo ? (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: '#0E171E',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderTopLeftRadius: 14,
                            borderTopRightRadius: 14,
                            borderBottomLeftRadius: bottomLeftRadius,
                            borderBottomRightRadius: bottomRightRadius,
                        },
                    ]}
                >
                    <View style={{ opacity: 0.12 }}>
                        <Text style={{ fontSize: 72 }}>🎬</Text>
                    </View>
                </View>
            ) : null}

            {/* Dull / Dimmed Scrim Overlay */}
            <View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: hasImagePreview ? 'rgba(7, 13, 18, 0.44)' : 'rgba(0, 0, 0, 0.28)',
                        borderTopLeftRadius: 14,
                        borderTopRightRadius: 14,
                        borderBottomLeftRadius: bottomLeftRadius,
                        borderBottomRightRadius: bottomRightRadius,
                    },
                ]}
            />

            {/* Centered Download Action */}
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {downloading ? (
                    <DownloadRing progress={state.progress} size={62} showPercent />
                ) : (
                    <View style={[styles.dlCircle, isError && { borderColor: 'rgba(239, 68, 68, 0.6)' }]}>
                        <DownloadIcon size={26} color={isError ? '#EF4444' : '#FFFFFF'} />
                    </View>
                )}
                <View style={[styles.dlSizePill, isError && { backgroundColor: 'rgba(239, 68, 68, 0.28)' }]}>
                    <Text style={[styles.dlSizeText, isError && { color: '#FFA4A4' }]}>{label}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// WhatsApp-style extension-based badge colors
function getDocBadgeColor(fileName?: string | null): string {
    const ext = (fileName || '').split('.').pop()?.toLowerCase() ?? '';
    switch (ext) {
        case 'pdf': return '#E53935'; // Red for PDF
        case 'doc':
        case 'docx': return '#1E88E5'; // Blue for Word
        case 'xls':
        case 'xlsx':
        case 'csv': return '#2E7D32'; // Green for Excel/Sheets
        case 'ppt':
        case 'pptx': return '#E65100'; // Orange for Slides
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz': return '#D97706'; // Amber for Archives
        case 'txt':
        case 'md':
        case 'log': return '#0284C7'; // Cyan for text
        case 'mp3':
        case 'wav':
        case 'm4a': return '#8B5CF6'; // Purple for audio
        default: return '#5F66CD';
    }
}

// Replies are green, like WhatsApp: bar in the brand green, name a shade that reads on each theme
const REPLY_BAR = '#20C65A';
const REPLY_TEXT = '#2BD96B';
const REPLY_TINT = 'rgba(32, 198, 90, 0.12)';

// ──────────────────── MESSAGE BUBBLE ────────────────────
function MessageBubbleInner({
    msg,
    isSelf,
    animateIn,
    isFirstInRun,
    isLastInRun,
    theme,
    onMedia,
    onLongPress,
    onPress,
    isSelected,
    isPinned,
    onReply,
    onPressQuote,
    myId,
    senderOf,
    responses,
    onVote,
    onDownload,
    onOpenFile,
}: {
    msg: SkflMessage;
    isSelf: boolean;
    animateIn: boolean;
    /** first / last message of a consecutive run from the same sender */
    isFirstInRun: boolean;
    isLastInRun: boolean;
    theme: typeof DARK;
    onMedia: (url: string, type: 'image' | 'video' | 'file', msg: SkflMessage) => void;
    onLongPress: (msg: SkflMessage) => void;
    onPress?: (msg: SkflMessage) => void;
    isSelected?: boolean;
    isPinned?: boolean;
    onReply: (msg: SkflMessage) => void;
    onPressQuote?: (id: string) => void;
    myId?: string;
    /** author (device id) of a message by its id: resolves the quote label of older replies */
    senderOf?: (id: string) => string | undefined;
    /** poll votes / event RSVPs for this message */
    responses: ResponseRow[];
    onVote: (msg: SkflMessage, choice: string) => void;
    /** tap on someone else's photo / video / voice note that is not on this phone yet */
    onDownload: (msg: SkflMessage) => void;
    /** tap on a document: download if needed, then the phone's "Open with" list */
    onOpenFile: (msg: SkflMessage) => void;
}) {
    const maxW = getBubbleMaxWidth();

    // Entrance for messages that arrive live (or that we just sent)
    const [animate] = useState(animateIn);
    const enter = useRef(new Animated.Value(animate ? 0 : 1)).current;
    const glow = useRef(new Animated.Value(animate && !isSelf ? 1 : 0)).current;
    // Selection band: fades in / out smoothly instead of snapping
    const selAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
    useEffect(() => {
        Animated.timing(selAnim, {
            toValue: isSelected ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [isSelected]);

    const isDeleted = !!msg.deleted_at;
    const isEdited = !!msg.edited_at && !isDeleted;
    const isImage = msg.message_type === 'image';
    const isVideo = msg.message_type === 'video';
    const isVisualMedia = !isDeleted && (isImage || isVideo) && !!msg.media_public_url;
    const isText = msg.message_type === 'text' && !isDeleted;

    // Someone else's attachment stays on the server until it is tapped; once downloaded it is shown from the phone
    const media = useMediaState(msg.id);
    const gated = !isDeleted && needsDownload(msg, isSelf, media);
    const mediaUri = (media.status === 'ready' && media.uri) || msg.media_public_url || '';
    const sizeText = formatFileSize(msg.media_file_size);
    const uploadFrac = useUploadProgress(msg.id); // set while our own attachment is being sent

    // Rich payload parsing (poll, event, contact, or reply)
    const rich = useMemo(() => (!isDeleted ? parseRich(msg.content) : null), [isDeleted, msg.content]);
    const replyPayload = rich?.kind === 'reply' ? rich : null;
    const quotedReply = replyPayload?.replyTo;
    const quoteIsMe =
        !!quotedReply &&
        isOwnMessage({ id: quotedReply.id, sender_client_id: quotedReply.sender_client_id || senderOf?.(quotedReply.id) || '' }, myId);
    const canReply = !isDeleted;

    // Swipe to reply PanResponder & animation
    const swipeX = useRef(new Animated.Value(0)).current;
    const isSwiping = useRef(false);
    const swipeTriggered = useRef(false);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    if (!canReply) return false;
                    const isHorizontal = Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4;
                    if (!isHorizontal) return false;
                    // Left swipe on sent messages; right swipe on incoming messages
                    if (isSelf && gestureState.dx < 0) return true;
                    if (!isSelf && gestureState.dx > 0) return true;
                    return false;
                },
                onPanResponderGrant: () => {
                    if (!canReply) return;
                    isSwiping.current = true;
                    swipeTriggered.current = false;
                },
                onPanResponderMove: (_, gestureState) => {
                    if (!canReply) return;
                    let dx = gestureState.dx;
                    if (isSelf) {
                        dx = Math.max(-75, Math.min(0, dx));
                        if (dx <= -42 && !swipeTriggered.current) {
                            swipeTriggered.current = true;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                        }
                    } else {
                        dx = Math.min(75, Math.max(0, dx));
                        if (dx >= 42 && !swipeTriggered.current) {
                            swipeTriggered.current = true;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                        }
                    }
                    swipeX.setValue(dx);
                },
                onPanResponderRelease: () => {
                    if (swipeTriggered.current && canReply) {
                        onReply(msg);
                    }
                    Animated.spring(swipeX, {
                        toValue: 0,
                        friction: 6,
                        tension: 110,
                        useNativeDriver: true,
                    }).start(() => {
                        isSwiping.current = false;
                        swipeTriggered.current = false;
                    });
                },
                onPanResponderTerminate: () => {
                    Animated.spring(swipeX, {
                        toValue: 0,
                        friction: 6,
                        tension: 110,
                        useNativeDriver: true,
                    }).start(() => {
                        isSwiping.current = false;
                        swipeTriggered.current = false;
                    });
                },
            }),
        [isSelf, msg, onReply, canReply]
    );

    // A live edit (by anyone) makes the bubble flash gold once so the change is noticed
    const seenEdit = useRef(msg.edited_at);
    useEffect(() => {
        if (msg.edited_at && msg.edited_at !== seenEdit.current) {
            seenEdit.current = msg.edited_at;
            glow.setValue(1);
            Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
        }
    }, [msg.edited_at]);

    useEffect(() => {
        if (!animate) return;
        Animated.spring(enter, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
        if (!isSelf) {
            Animated.sequence([
                Animated.delay(260),
                Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]).start();
        }
    }, []);

    const enterStyle = {
        opacity: enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
        transform: [
            { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [isSelf ? 36 : -36, 0] }) },
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
        ],
    };

    // Extract display text (text message or caption for media)
    let displayText: string | null = null;
    if (!isDeleted) {
        if (replyPayload) {
            displayText = replyPayload.text || null;
        } else if (!rich) {
            if (isText) {
                displayText = msg.content;
            } else if (msg.content && msg.content !== msg.media_file_name && msg.content !== msg.media_original_name) {
                displayText = msg.content;
            }
        }
    }

    const hasCaption = isVisualMedia && !!displayText;
    const cardW = Math.min(maxW - 28, 300);
    // Emoji-only text is shown big (fewer emojis = bigger); a single emoji drops the bubble altogether
    const emojiCount = displayText && isText && !rich ? emojiOnlyCount(displayText) : 0;
    const emojiSize = emojiFontSize(emojiCount);
    const bareEmoji = emojiSize !== null && emojiCount === 1;
    const floatFooter = ((isText && !rich) || isDeleted || hasCaption) && emojiSize === null;
    const bubbleBorder = isSelf ? theme.accent + '1A' : theme.border;

    const tick = (onDark = false) => {
        if (!isSelf || isDeleted) return null;
        if (msg.id.startsWith('opt_')) {
            return <Clock size={12} color={onDark ? '#E5E7EB' : theme.tickSent} style={{ marginLeft: 3 }} />;
        }
        // Always the grey double tick, whether or not anyone has opened the message. It pops in just after sending.
        return (
            <DoubleTick
                color={onDark ? '#E5E7EB' : theme.tickSent}
                animate={Date.now() - Date.parse(msg.created_at) < 4000}
            />
        );
    };

    const mediaW = Math.min(maxW - 8, 280);
    const mediaH =
        msg.media_width && msg.media_height
            ? Math.max(140, Math.min(340, mediaW * (msg.media_height / msg.media_width)))
            : isVideo ? 170 : 210;

    const timeSpacer = '\u00A0'.repeat((isSelf && !isDeleted ? 18 : 14) + (isEdited ? 7 : 0) + (isPinned ? 3 : 0));

    return (
        <Animated.View
            style={[
                styles.bubbleRow,
                isSelf ? styles.bubbleRowSelf : styles.bubbleRowOther,
                { marginTop: isFirstInRun ? 6 : 1.5, marginBottom: 1.5, position: 'relative' },
                enterStyle,
            ]}
        >
            {/* Selection band across the whole row: a subtle warm gold wash that fades in behind the bubble */}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: 'rgba(229, 178, 78, 0.14)',
                        opacity: selAnim,
                        transform: [{ scaleY: selAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
                    },
                ]}
            />
            {/* The empty space beside the bubble is part of the message too: tapping it selects (while selecting),
                long-pressing it starts a selection, exactly like the bubble itself */}
            <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => onPress?.(msg)}
                onLongPress={() => onLongPress(msg)}
                delayLongPress={300}
            />
            <Animated.View
                style={{ transform: [{ translateX: swipeX }], maxWidth: maxW }}
                {...panResponder.panHandlers}
            >
                <Pressable
                    onPress={() => onPress?.(msg)}
                    onLongPress={() => onLongPress(msg)}
                    delayLongPress={300}
                    style={{ maxWidth: maxW }}
                >
                    <View style={[
                        styles.bubble,
                        isSelf ? styles.bubbleSelf : styles.bubbleOther,
                        {
                            maxWidth: maxW,
                            minWidth: isVisualMedia ? undefined : isSelf ? (isEdited ? 150 : 110) : (isEdited ? 126 : 92),
                            backgroundColor: bareEmoji ? 'transparent' : isSelf ? theme.outBubble : theme.inBubble,
                            paddingHorizontal: isVisualMedia ? 3 : 10,
                            paddingTop: isVisualMedia ? 3 : 6,
                            paddingBottom: isVisualMedia ? 3 : 6,
                            // no drop shadow on message rows: it costs a lot on Android while scrolling, and the border already defines the bubble
                            borderWidth: bareEmoji ? 0 : 1,
                            borderColor: bubbleBorder,
                        },
                    ]}>

                        {/* Quoted reply box (WhatsApp style) */}
                        {quotedReply && (
                            <TouchableOpacity
                                onPress={() => quotedReply.id && onPressQuote?.(quotedReply.id)}
                                activeOpacity={0.8}
                                style={[
                                    styles.quoteBox,
                                    {
                                        backgroundColor: REPLY_TINT,
                                        borderLeftColor: REPLY_BAR,
                                        marginHorizontal: isVisualMedia ? 4 : 0,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1, paddingRight: 6 }}>
                                    <Text
                                        style={[
                                            styles.quoteSender,
                                            { color: REPLY_TEXT },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {quoteIsMe ? 'You' : 'Anonymous'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.quoteText,
                                            { color: isSelf ? theme.outText : theme.inText },
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {quotedReply.text}
                                    </Text>
                                </View>
                                {quotedReply.media_url ? (
                                    <Image source={{ uri: quotedReply.media_url }} style={styles.quoteThumb} resizeMode="cover" />
                                ) : null}
                            </TouchableOpacity>
                        )}

                        {/* Image / video: time + ticks sit on the picture, bottom-right */}
                        {isVisualMedia && (
                            <View>
                                {gated ? (
                                    <DownloadTile
                                        width={mediaW}
                                        height={mediaH}
                                        bottomLeftRadius={isSelf ? 14 : 4}
                                        bottomRightRadius={isSelf ? 4 : 14}
                                        isVideo={isVideo}
                                        sizeText={sizeText}
                                        state={media}
                                        previewUri={msg.media_public_url}
                                        onPress={() => onDownload(msg)}
                                        onLongPress={() => onLongPress(msg)}
                                    />
                                ) : isImage ? (
                                    <TouchableOpacity onPress={() => onMedia(mediaUri, 'image', msg)} onLongPress={() => onLongPress(msg)} delayLongPress={280} activeOpacity={0.9}>
                                        <Image
                                            source={{ uri: mediaUri }}
                                            style={[
                                                styles.mediaImg,
                                                {
                                                    width: mediaW,
                                                    height: mediaH,
                                                    borderTopLeftRadius: 14,
                                                    borderTopRightRadius: 14,
                                                    borderBottomLeftRadius: isSelf ? 14 : 4,
                                                    borderBottomRightRadius: isSelf ? 4 : 14,
                                                }
                                            ]}
                                            resizeMode="cover"
                                            resizeMethod="auto"
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity onPress={() => onMedia(mediaUri, 'video', msg)} onLongPress={() => onLongPress(msg)} delayLongPress={280} activeOpacity={0.9}
                                        style={[
                                            styles.videoThumb,
                                            {
                                                width: mediaW,
                                                height: mediaH,
                                                borderTopLeftRadius: 14,
                                                borderTopRightRadius: 14,
                                                borderBottomLeftRadius: isSelf ? 14 : 4,
                                                borderBottomRightRadius: isSelf ? 4 : 14,
                                            }
                                        ]}>
                                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.videoGradient}>
                                            <View style={styles.videoPlay}><Text style={styles.videoPlayIcon}>▶</Text></View>
                                            <Text style={styles.videoDur}>{formatDuration(msg.media_duration_ms)}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                                {uploadFrac !== undefined && (
                                    <View style={[styles.uploadScrim, { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: isSelf ? 14 : 4, borderBottomRightRadius: isSelf ? 4 : 14 }]} pointerEvents="none">
                                        <UploadRing progress={uploadFrac} size={58} />
                                    </View>
                                )}
                                {!hasCaption && (
                                    <View style={styles.mediaTimePill} pointerEvents="none">
                                        <Text style={styles.mediaTimeText}>{formatTime(msg.created_at)}</Text>
                                        {tick(true)}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Caption under visual media */}
                        {hasCaption && (
                            <View style={{ paddingHorizontal: 6, paddingTop: 4, paddingBottom: 2 }}>
                                <Text style={[styles.msgText, { color: isSelf ? theme.outText : theme.inText }]}>
                                    {displayText}
                                    <Text style={styles.timeSpacer}>{timeSpacer}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Imported audio file: show its name */}
                        {msg.message_type === 'audio' && !!msg.media_public_url && !!msg.media_original_name && !msg.media_original_name.startsWith('voice_') && (
                            <Text style={[styles.audioName, { color: isSelf ? theme.outText : theme.inText }]} numberOfLines={1}>{msg.media_original_name}</Text>
                        )}

                        {/* Audio */}
                        {msg.message_type === 'audio' && msg.media_public_url && (
                            <AudioPlayerBubble
                                url={mediaUri}
                                durationMs={msg.media_duration_ms}
                                isSelf={isSelf}
                                theme={theme}
                                download={gated ? { state: media, sizeText, onPress: () => onDownload(msg) } : null}
                                upload={uploadFrac}
                            />
                        )}

                        {/* File: Sender's phone shows NO download button; Recipient's phone shows sleek WhatsApp circular download button */}
                        {msg.message_type === 'file' && msg.media_public_url && (
                            <TouchableOpacity
                                onPress={() => onOpenFile(msg)}
                                onLongPress={() => onLongPress(msg)}
                                delayLongPress={280}
                                style={[
                                    styles.fileCard,
                                    {
                                        backgroundColor: isSelf
                                            ? 'rgba(255, 255, 255, 0.06)'
                                            : 'rgba(255, 255, 255, 0.05)',
                                    },
                                ]}
                                activeOpacity={0.82}
                            >
                                <View style={[styles.fileIconBox, { backgroundColor: getDocBadgeColor(msg.media_file_name) }]}>
                                    <Text style={styles.fileIconText}>{fileExtension(msg.media_file_name)}</Text>
                                </View>
                                <View style={styles.fileInfo}>
                                    <Text style={[styles.fileName, { color: isSelf ? theme.outText : theme.inText }]} numberOfLines={2}>
                                        {msg.media_original_name || msg.media_file_name}
                                    </Text>
                                    <Text style={[styles.fileMeta, { color: isSelf ? theme.tsOut : theme.tsIn }]}>
                                        {fileExtension(msg.media_file_name)} • {sizeText}
                                        {!isSelf && media.status === 'downloading' ? (
                                            <Text style={{ color: AUDIO_GREEN, fontWeight: '800' }}>{`  ·  ${Math.round(media.progress * 100)}%`}</Text>
                                        ) : null}
                                        {!isSelf && media.status === 'error' ? (
                                            <Text style={{ color: theme.danger, fontWeight: '700' }}>{'  ·  Failed · tap to retry'}</Text>
                                        ) : null}
                                    </Text>
                                    {!isSelf && media.status === 'downloading' && (
                                        <View style={styles.fileProgressTrack}>
                                            <View style={[styles.fileProgressFill, { width: `${Math.max(4, Math.round(media.progress * 100))}%` }]} />
                                        </View>
                                    )}
                                </View>
                                {uploadFrac !== undefined && <UploadRing progress={uploadFrac} size={40} />}
                                {gated && (media.status === 'downloading' ? (
                                    <View style={{ marginLeft: 6 }}>
                                        <DownloadRing progress={media.progress} size={40} />
                                    </View>
                                ) : (
                                    <View
                                        style={[
                                            styles.fileDownloadBtn,
                                            {
                                                backgroundColor: 'rgba(0, 168, 132, 0.12)',
                                                borderColor: 'rgba(0, 168, 132, 0.38)',
                                            },
                                        ]}
                                    >
                                        <DownloadIcon size={17} color="#00A884" />
                                    </View>
                                ))}
                            </TouchableOpacity>
                        )}
                        {msg.message_type === 'file' && !!displayText && (
                            <View style={{ paddingHorizontal: 6, paddingTop: 2, paddingBottom: 2 }}>
                                <Text style={[styles.msgText, { color: isSelf ? theme.outText : theme.inText }]}>
                                    {displayText}
                                    <Text style={styles.timeSpacer}>{timeSpacer}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Poll / event / contact card */}
                        {rich?.kind === 'poll' && (
                            <PollCard
                                payload={rich}
                                rows={responses}
                                myId={myId}
                                canVote={!msg.id.startsWith('opt_')}
                                onVote={(c) => onVote(msg, c)}
                                theme={theme}
                                width={cardW}
                                footerRight={
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {isEdited && <Text style={[styles.editedLabel, { color: isSelf ? theme.tsOut : theme.tsIn }]}>Edited</Text>}
                                        <Text style={[styles.msgTime, { color: isSelf ? theme.tsOut : theme.tsIn }]}>{formatTime(msg.created_at)}</Text>
                                        {tick()}
                                    </View>
                                }
                            />
                        )}
                        {rich?.kind === 'event' && (
                            <EventCard payload={rich} rows={responses} myId={myId} canVote={!msg.id.startsWith('opt_')} onVote={(c) => onVote(msg, c)} theme={theme} width={cardW} />
                        )}
                        {rich?.kind === 'contact' && <ContactCard payload={rich} theme={theme} width={cardW} />}

                        {/* Deleted for everyone */}
                        {isDeleted && (
                            <View style={styles.deletedRow}>
                                <BanIcon size={15} color={theme.placeholder} style={{ marginRight: 6 }} />
                                <Text style={[styles.deletedText, { color: theme.placeholder }]}>
                                    This message was deleted
                                    <Text style={styles.timeSpacer}>{timeSpacer}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Text message (normal or reply) */}
                        {isText && (!rich || replyPayload) && !!displayText && (
                            <Text
                                style={[
                                    styles.msgText,
                                    { color: isSelf ? theme.outText : theme.inText },
                                    emojiSize !== null && {
                                        fontSize: emojiSize,
                                        // Tighter line-height for the jumbo single-emoji so the chip doesn't get extra vertical space
                                        lineHeight: Math.round(emojiSize * (emojiCount === 1 ? 1.15 : 1.25)),
                                        letterSpacing: 2,
                                        // Reserve the real drawn width of the emojis. Android measures colour emoji narrower than it
                                        // draws them, and a bubble sized to that measurement clipped the last emoji (2 and 3 emojis).
                                        minWidth: Math.ceil(emojiCount * emojiSize * 1.4),
                                        paddingRight: emojiCount === 1 ? 0 : 6,
                                        includeFontPadding: false,
                                        textAlign: 'left',
                                    },
                                ]}
                            >
                                {displayText}
                                {emojiSize === null && <Text style={styles.timeSpacer}>{timeSpacer}</Text>}
                            </Text>
                        )}

                        {/* Footer for text (absolute, bottom-right) and for audio / files (below the media) */}
                        {(!isVisualMedia || hasCaption) && rich?.kind !== 'poll' && (
                            <View
                                style={[
                                    floatFooter ? styles.bubbleFooterFloat : styles.bubbleFooter,
                                    // a bare emoji has no bubble, so its time sits in a small chip of its own
                                    bareEmoji && {
                                        backgroundColor: isSelf ? theme.outBubble : theme.inBubble,
                                        borderRadius: 12,
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                    },
                                ]}
                            >
                                {isPinned && <PinActionIcon size={11} color={isSelf ? theme.tsOut : theme.tsIn} style={{ marginRight: 3 }} />}
                                {isEdited && <Text style={[styles.editedLabel, { color: isSelf ? theme.tsOut : theme.tsIn }]}>Edited</Text>}
                                <Text style={[styles.msgTime, { color: isSelf ? theme.tsOut : theme.tsIn }]} numberOfLines={1}>{formatTime(msg.created_at)}</Text>
                                {tick()}
                            </View>
                        )}

                        {/* Fading glow border that flags a freshly arrived or edited message */}
                        {!bareEmoji && (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    StyleSheet.absoluteFill,
                                    isSelf ? styles.bubbleSelf : styles.bubbleOther,
                                    {
                                        borderWidth: 1.5,
                                        borderColor: theme.accent,
                                        opacity: glow,
                                    },
                                ]}
                            />
                        )}
                    </View>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

// The double tick pops in when a message has just been sent
function DoubleTick({ color, animate }: { color: string; animate: boolean }) {
    const scale = useRef(new Animated.Value(animate ? 0.4 : 1)).current;
    useEffect(() => {
        if (animate) Animated.spring(scale, { toValue: 1, friction: 4, tension: 170, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={{ marginLeft: 3, transform: [{ scale }] }}>
            <CheckCheck size={15} color={color} />
        </Animated.View>
    );
}

// Rows only redraw when their own data changes (the list passes stable handlers)
const MessageBubble = React.memo(MessageBubbleInner);

const LOADING_GOLD = '#E5B24E';

/**
 * Round scroll-to-bottom button: floats above the message bar, bottom-right, once the user has scrolled up.
 * Tapping it jumps to the newest message immediately. It eases in and out rather than popping, and the arrow
 * bobs gently while it waits so it reads as "tap me to go down", not a static badge.
 */
/** Two stacked chevrons pointing down — the WhatsApp scroll-to-bottom glyph. */
function DoubleChevronDown({ size = 20, color = '#E8EAED' }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <SvgPath d="M5 6l7 6 7-6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            <SvgPath d="M5 12l7 6 7-6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ScrollDownButton({ visible, unseenCount, onPress }: { visible: boolean; unseenCount: number; onPress: () => void }) {
    const enter = useRef(new Animated.Value(0)).current;
    const badgeIn = useRef(new Animated.Value(unseenCount > 0 ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(enter, { toValue: visible ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
    }, [visible]);

    // The unread badge pops in on its own, the way WhatsApp's does, rather than appearing with the button
    useEffect(() => {
        Animated.spring(badgeIn, { toValue: unseenCount > 0 ? 1 : 0, friction: 6, tension: 200, useNativeDriver: true }).start();
    }, [unseenCount > 0]);

    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.scrollDownBtnWrap,
                {
                    opacity: enter,
                    transform: [{ scale: enter }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.scrollDownBtn}
                accessibilityLabel={unseenCount > 0 ? `Scroll to ${unseenCount} new messages` : 'Scroll to newest message'}
            >
                <DoubleChevronDown />
            </TouchableOpacity>

            {unseenCount > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.scrollDownBadge,
                        { opacity: badgeIn, transform: [{ scale: badgeIn }] },
                    ]}
                >
                    <Text style={styles.scrollDownBadgeText} numberOfLines={1}>
                        {unseenCount > 99 ? '99+' : unseenCount}
                    </Text>
                </Animated.View>
            )}
        </Animated.View>
    );
}

/** Three gold dots that bounce in sequence — shown while the chat is loading or settling on the newest message. */
function LoadingDots() {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        const loops = dots.map((d, i) =>
            Animated.loop(Animated.sequence([
                Animated.delay(i * 150),
                Animated.timing(d, { toValue: -7, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.delay((2 - i) * 150),
            ]))
        );
        loops.forEach((l) => l.start());
        return () => loops.forEach((l) => l.stop());
    }, []);

    return (
        <View style={styles.loadingDotsRow}>
            {dots.map((d, i) => (
                <Animated.View key={i} style={[styles.loadingDot, { backgroundColor: LOADING_GOLD, transform: [{ translateY: d }] }]} />
            ))}
        </View>
    );
}

type FloatingChipHandle = { setLabel: (l: string) => void; pulse: () => void };

/**
 * The day label that floats at the top while scrolling. It keeps its own state, so changing the day
 * while scrolling redraws only this small chip, never the whole chat.
 */
const FloatingDayChip = React.memo(
    React.forwardRef<FloatingChipHandle>(function FloatingDayChip(_props, ref) {
        const [label, setLabel] = useState('');
        const opacity = useRef(new Animated.Value(0)).current;
        const timer = useRef<any>(null);
        const visible = useRef(false);

        React.useImperativeHandle(ref, () => ({
            setLabel: (l: string) => setLabel((prev) => (prev === l ? prev : l)),
            pulse: () => {
                if (!visible.current) {
                    visible.current = true;
                    Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
                }
                clearTimeout(timer.current);
                timer.current = setTimeout(() => {
                    visible.current = false;
                    Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
                }, 1100);
            },
        }));

        if (!label) return null;
        return (
            <Animated.View style={[styles.floatDate, { opacity }]} pointerEvents="none">
                <View
                    style={[
                        styles.dayChip,
                        {
                            backgroundColor: 'rgba(20, 28, 38, 0.95)',
                            borderColor: 'rgba(125, 160, 200, 0.55)',
                        },
                    ]}
                >
                    <Text style={[styles.dayChipText, { color: '#D3D9E0' }]}>{label}</Text>
                </View>
            </Animated.View>
        );
    })
);

// ──────────────────── DAY SEPARATOR ────────────────────
function DayChip({ label }: { label: string; theme?: typeof DARK }) {
    return (
        <View style={styles.dayChipRow} pointerEvents="none">
            <View
                style={[
                    styles.dayChip,
                    {
                        backgroundColor: 'rgba(20, 28, 38, 0.92)',
                        borderColor: 'rgba(125, 160, 200, 0.5)',
                    },
                ]}
            >
                <Text style={[styles.dayChipText, { color: '#D3D9E0' }]}>{label}</Text>
            </View>
        </View>
    );
}

// ──────────────────── LIGHTBOX MODAL ────────────────────
function LightboxModal({ visible, url, type, msg, onClose }: {
    visible: boolean; url: string; type: 'image' | 'video' | 'file'; msg: SkflMessage | null; onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [busy, setBusy] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        if (!visible) {
            setBusy(null);
            setResult(null);
        }
    }, [visible]);

    // Download to the phone's storage, then show the system "Open with" list
    const download = async () => {
        if (busy || !msg) return;
        setResult(null);
        setBusy('Downloading…');
        const r = await downloadAndOpen(msg, setBusy);
        setBusy(null);
        setResult(r.message);
        setTimeout(() => setResult(null), 4000);
    };
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
            <View style={styles.lbOverlay}>
                <View style={[styles.lbTopBar, { height: 60 + Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0), paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) }]}>
                    <TouchableOpacity onPress={onClose} style={styles.lbTopBtn}><Text style={styles.lbTopBtnText}>✕</Text></TouchableOpacity>
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                        <Text style={styles.lbFileName} numberOfLines={1}>{msg?.media_original_name || msg?.media_file_name || ''}</Text>
                        <Text style={styles.lbFileMeta}>Stored on Supabase Storage • {formatFileSize(msg?.media_file_size)}</Text>
                    </View>
                    <TouchableOpacity onPress={download} disabled={!!busy} style={styles.lbTopBtn} accessibilityLabel="Download">
                        {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <DownloadIcon size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>
                <View style={styles.lbContent}>
                    {type === 'image' && <Image source={{ uri: url }} style={styles.lbImage} resizeMode="contain" resizeMethod="auto" />}
                    {type === 'video' && (
                        <View style={styles.lbVideoCard}>
                            <Text style={{ fontSize: 48 }}>🎬</Text>
                            <Text style={styles.lbVideoName}>{msg?.media_original_name}</Text>
                            <TouchableOpacity onPress={download} disabled={!!busy} style={styles.lbOpenBtn}>
                                <Text style={styles.lbOpenBtnText}>{busy ? busy : '⬇  Download & open'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {type === 'file' && (
                        <View style={styles.lbFileCard}>
                            <View style={[styles.lbFileIcon, { backgroundColor: getDocBadgeColor(msg?.media_file_name) }]}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.8 }}>
                                    {fileExtension(msg?.media_file_name)}
                                </Text>
                            </View>
                            <Text style={styles.lbFileName2}>{msg?.media_original_name || msg?.media_file_name}</Text>
                            <Text style={styles.lbFileMeta2}>{fileExtension(msg?.media_file_name)} • {formatFileSize(msg?.media_file_size)}</Text>
                            <TouchableOpacity
                                onPress={download}
                                disabled={!!busy}
                                style={[
                                    styles.lbOpenBtn,
                                    {
                                        backgroundColor: '#00A884',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    },
                                ]}
                            >
                                <DownloadIcon size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={[styles.lbOpenBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                                    {busy ? busy : 'Download Document'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Progress / result of the download */}
                {(busy || result) && (
                    <View style={[styles.lbStatus, { bottom: insets.bottom + 26 }]} pointerEvents="none">
                        {busy ? <ActivityIndicator size="small" color="#20C65A" style={{ marginRight: 8 }} /> : null}
                        <Text style={styles.lbStatusText}>{busy || result}</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

// ──────────────────── EMPLOYEE ACTIVITY & MESSAGE LOG (CLEAN & SIMPLE) ────────────────────
function EmployeeActivityModal({
    visible,
    theme,
    messages,
    onClose,
    onClear,
    myId,
}: {
    visible: boolean;
    theme: typeof DARK;
    messages: SkflMessage[];
    onClose: () => void;
    onClear: () => void;
    myId?: string;
}) {
    const [filter, setFilter] = useState<'all' | 'text' | 'media'>('all');
    const [search, setSearch] = useState('');

    const filtered = messages.filter((m) => {
        if (filter === 'text' && m.message_type !== 'text') return false;
        if (filter === 'media' && m.message_type === 'text') return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            const contentMatch = m.content?.toLowerCase().includes(q);
            const badgeMatch = m.sender_badge?.toLowerCase().includes(q);
            const nameMatch = m.media_original_name?.toLowerCase().includes(q);
            return contentMatch || badgeMatch || nameMatch;
        }
        return true;
    });

    const confirmClear = () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to clear chat history?')) onClear();
        } else {
            onClear();
        }
    };

    const textCount = messages.filter((m) => m.message_type === 'text').length;
    const mediaCount = messages.filter((m) => m.message_type !== 'text').length;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.inspOverlay, { backgroundColor: theme.overlay }]}>
                <View style={[styles.inspCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {/* Header */}
                    <LinearGradient colors={['#16232D', '#0F1A21']} style={styles.inspHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inspTitle}>📋 Employee Message Activity</Text>
                                <Text style={styles.inspSub}>
                                    Live enterprise log • {messages.length} messages recorded
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.inspClose}>
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick Stats Pill Strip */}
                        <View style={styles.empStatsRow}>
                            <View style={[styles.empStatChip, { backgroundColor: 'rgba(32,198,90,0.15)' }]}>
                                <Text style={[styles.empStatNum, { color: '#2FD06B' }]}>{messages.length}</Text>
                                <Text style={styles.empStatTxt}>Total</Text>
                            </View>
                            <View style={[styles.empStatChip, { backgroundColor: 'rgba(52,183,241,0.15)' }]}>
                                <Text style={[styles.empStatNum, { color: '#34B7F1' }]}>{textCount}</Text>
                                <Text style={styles.empStatTxt}>Texts</Text>
                            </View>
                            <View style={[styles.empStatChip, { backgroundColor: 'rgba(172,68,207,0.15)' }]}>
                                <Text style={[styles.empStatNum, { color: '#AC44CF' }]}>{mediaCount}</Text>
                                <Text style={styles.empStatTxt}>Media Files</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Search bar & filter pills */}
                    <View style={[styles.empFilterBox, { borderBottomColor: theme.border }]}>
                        <View style={[styles.empSearchWrap, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                            <Text style={{ fontSize: 14, color: theme.placeholder, marginRight: 6 }}>🔍</Text>
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search messages or staff badge..."
                                placeholderTextColor={theme.placeholder}
                                style={[styles.empSearchInput, { color: theme.inputText }]}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <Text style={{ color: theme.placeholder, fontSize: 14, paddingHorizontal: 4 }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filter pills */}
                        <View style={styles.empPillsRow}>
                            <TouchableOpacity
                                onPress={() => setFilter('all')}
                                style={[styles.empPill, filter === 'all' && styles.empPillActive]}
                            >
                                <Text style={[styles.empPillTxt, filter === 'all' && styles.empPillTxtActive]}>
                                    All ({messages.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setFilter('text')}
                                style={[styles.empPill, filter === 'text' && styles.empPillActive]}
                            >
                                <Text style={[styles.empPillTxt, filter === 'text' && styles.empPillTxtActive]}>
                                    💬 Texts ({textCount})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setFilter('media')}
                                style={[styles.empPill, filter === 'media' && styles.empPillActive]}
                            >
                                <Text style={[styles.empPillTxt, filter === 'media' && styles.empPillTxtActive]}>
                                    📎 Media ({mediaCount})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Simple Readable Employee Message List */}
                    <ScrollView style={styles.empListScroll} contentContainerStyle={{ padding: 12 }}>
                        {filtered.length === 0 ? (
                            <View style={styles.empEmpty}>
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                                <Text style={[styles.empEmptyTitle, { color: theme.inputText }]}>No messages found</Text>
                                <Text style={[styles.empEmptySub, { color: theme.placeholder }]}>
                                    {search ? 'Try another search query' : 'Messages will appear here as staff chat'}
                                </Text>
                            </View>
                        ) : (
                            filtered.map((m) => (
                                <View key={m.id} style={[styles.empCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                                    {/* Top: Avatar + Sender Badge + Time */}
                                    <View style={styles.empCardTop}>
                                        {(() => {
                                            const isMyMsg = isOwnMessage(m, myId);
                                            const staffColor = isMyMsg ? SELF_ANON_COLOR : OTHER_ANON_COLOR;
                                            return (
                                                <>
                                                    <View style={[styles.empAvatar, { backgroundColor: staffColor }]}>
                                                        <Text style={styles.empAvatarTxt}>A</Text>
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={[styles.empStaffName, { color: theme.inputText }]}>
                                                                {isMyMsg ? 'You (Staff)' : 'Anonymous Staff'}
                                                            </Text>
                                                            <View style={[styles.empBadgePill, { backgroundColor: staffColor + '25' }]}>
                                                                <Text style={[styles.empBadgeTxt, { color: staffColor }]}>
                                                                    {isMyMsg ? '★ You' : '🔒 Anonymous'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text style={[styles.empTimeTxt, { color: theme.placeholder }]}>{formatTime(m.created_at)}</Text>
                                                    </View>
                                                </>
                                            );
                                        })()}
                                        <View style={styles.empDeliveredBadge}>
                                            <Text style={styles.empDeliveredTxt}>✓ Delivered</Text>
                                        </View>
                                    </View>

                                    {/* Body Content */}
                                    {m.message_type === 'text' ? (
                                        <Text style={[styles.empCardContent, { color: theme.inputText }]}>{m.content}</Text>
                                    ) : (
                                        <View style={[styles.empMediaRow, { backgroundColor: theme.card }]}>
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>
                                                {m.message_type === 'image' ? '🖼' : m.message_type === 'video' ? '🎬' : m.message_type === 'audio' ? '🎵' : '📄'}
                                            </Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.empMediaTitle, { color: theme.inputText }]} numberOfLines={1}>
                                                    {m.media_original_name || `${m.message_type.toUpperCase()} Attachment`}
                                                </Text>
                                                <Text style={[styles.empMediaSub, { color: theme.placeholder }]}>
                                                    {formatFileSize(m.media_file_size)} • Cloud Synced
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* Bottom Action Footer */}
                    <View style={[styles.empFooter, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
                        <TouchableOpacity onPress={onClose} style={[styles.empActionBtn, { backgroundColor: theme.inputBg }]}>
                            <Text style={[styles.empActionBtnTxt, { color: theme.inputText }]}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={confirmClear} style={[styles.empActionBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                            <Text style={[styles.empActionBtnTxt, { color: '#EF4444' }]}>🗑 Clear History</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ──────────────────── HEADER (NORMAL / SELECTION / EDIT) ────────────────────
// ──────────────────── HEADER TITLE ────────────────────
// The team name, centered. It slides up and fades in once.
function HeaderTitle({ fontReady }: { fontReady: boolean }) {
    const enter = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const intro = Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true });
        intro.start();
        return () => intro.stop();
    }, []);

    // The name is ~14.73 em wide in Times New Roman Bold / Tinos (+0.3 letter-spacing per character): the largest size
    // that still fits between the header's side padding on this screen, at most 25
    const titleSize = Math.max(17, Math.min(25, Math.floor((SW - 32 - 8 - 8.7) / 14.73)));
    return (
        <Animated.View
            style={{
                flex: 1,
                width: '100%',
                height: 56,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: enter,
                transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
        >
            <AnimatedGradientText
                text="SKF Iron & Mining Pvt Ltd Team"
                align="center"
                style={{ width: '100%' }}
                fontSize={titleSize}
                fontFamily={fontReady ? HEADER_FONT : undefined}
                fontWeight="800"
                letterSpacing={0.3}
            />
        </Animated.View>
    );
}

function Header({
    theme,
    topInset = 34,
    selectedCount = 0,
    onClearSelection = () => { },
    onDeleteSelected = () => { },
    onOpenThreeDots = () => { },
    showMore = true,
    isEditing = false,
    onCancelEdit = () => { },
}: {
    theme: typeof DARK;
    onlineCount?: number;
    isConnected?: boolean;
    typing?: string | null;
    onDrive?: () => void;
    topInset?: number;
    /** how many messages are selected (0 = normal header) */
    selectedCount?: number;
    onClearSelection?: () => void;
    onDeleteSelected?: () => void;
    onOpenThreeDots?: () => void;
    /** show the three-dots button (nothing to offer when only deleted messages are selected) */
    showMore?: boolean;
    isEditing?: boolean;
    onCancelEdit?: () => void;
}) {
    const headerFontReady = useHeaderFont();
    const headerHeight = topInset + 56;

    // ── EDIT MODE (Image 3) ──
    if (isEditing) {
        return (
            <LinearGradient
                colors={['#101720', theme.headerBg, '#0A0E13']}
                style={[
                    styles.header,
                    {
                        height: headerHeight,
                        paddingTop: topInset,
                        paddingBottom: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(229, 178, 78, 0.28)',
                        elevation: 6,
                        shadowColor: '#000',
                        shadowOpacity: 0.35,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    },
                ]}
            >
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={onCancelEdit}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.headerNavBtn}
                        accessibilityLabel="Cancel editing"
                    >
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text
                        style={[
                            styles.editHeaderTitle,
                            { color: '#FFFFFF' },
                        ]}
                    >
                        Edit message
                    </Text>
                </View>
                <View style={styles.headerRight} />
            </LinearGradient>
        );
    }

    // ── SELECTION MODE (Image 1 & 2) ──
    if (selectedCount > 0) {
        return (
            <LinearGradient
                colors={['#101720', theme.headerBg, '#0A0E13']}
                style={[
                    styles.header,
                    {
                        height: headerHeight,
                        paddingTop: topInset,
                        paddingBottom: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(229, 178, 78, 0.28)',
                        elevation: 6,
                        shadowColor: '#000',
                        shadowOpacity: 0.35,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    },
                ]}
            >
                {/* Left: Back arrow + Selected count (Image 1 & 2) */}
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={onClearSelection}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.headerNavBtn}
                        accessibilityLabel="Cancel selection"
                    >
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text
                        style={[
                            styles.selectionCount,
                            { color: '#FFFFFF' },
                        ]}
                    >
                        {selectedCount}
                    </Text>
                </View>

                {/* Right: Strictly ONLY 2 items (Delete icon and 3-dots icon) */}
                <View style={styles.headerRightSelection}>
                    <TouchableOpacity
                        onPress={onDeleteSelected}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.selectionActionBtn}
                        accessibilityLabel={selectedCount > 1 ? 'Delete messages' : 'Delete message'}
                    >
                        <DeleteIcon size={25} color="#FFFFFF" />
                    </TouchableOpacity>

                    {showMore && (
                        <TouchableOpacity
                            onPress={onOpenThreeDots}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={[styles.selectionActionBtn, { marginLeft: 2 }]}
                            accessibilityLabel="More options"
                        >
                            <MoreVertical size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>
        );
    }

    // ── NORMAL MODE: the team name, centered, with the logo's gold rule under it ──
    return (
        <LinearGradient
            colors={['#101720', theme.headerBg, '#0A0E13']}
            style={[
                styles.header,
                {
                    height: headerHeight,
                    paddingTop: topInset,
                    paddingBottom: 0,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(229, 178, 78, 0.28)',
                    elevation: 6,
                    shadowColor: '#000',
                    shadowOpacity: 0.35,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                },
            ]}
        >
            <HeaderTitle fontReady={headerFontReady} />
        </LinearGradient>
    );
}

// ──────────────────── INPUT BAR ────────────────────
function InputBar({
    theme,
    onText,
    onAttach,
    onCamera,
    onVoice,
    onTyping,
    editing = null,
    onCancelEdit,
    replyingTo = null,
    onCancelReply,
    stagedMedia = null,
    onCancelStagedMedia,
    myId,
    bottomInset = 20,
    isKeyboardOpen = false,
    attachPanel = null,
    onAttachClose,
    onFocus,
}: {
    theme: typeof DARK;
    onText: (t: string) => void;
    onAttach: () => void;
    onCamera?: () => void;
    onVoice: () => void;
    onTyping: (v: boolean) => void;
    /** When set, the bar edits this message instead of composing a new one */
    editing?: { id: string; text: string } | null;
    onCancelEdit?: () => void;
    replyingTo?: SkflMessage | null;
    onCancelReply?: () => void;
    stagedMedia?: StagedMedia | null;
    onCancelStagedMedia?: () => void;
    myId?: string;
    bottomInset?: number;
    isKeyboardOpen?: boolean;
    /** The attachment panel, docked under the bar while open (where the keyboard was) */
    attachPanel?: React.ReactNode;
    onAttachClose?: () => void;
    onFocus?: () => void;
}) {
    const [text, setText] = useState('');
    const inputRef = useRef<TextInput>(null);

    // Entering edit mode loads the message text into the box and opens the keyboard
    useEffect(() => {
        if (!editing) return;
        setText(editing.text);
        const t = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, [editing?.id]);

    // Entering reply mode opens the keyboard
    useEffect(() => {
        if (!replyingTo) return;
        const t = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, [replyingTo?.id]);

    // Staging media focuses text input so user can optionally add a caption
    useEffect(() => {
        if (!stagedMedia) return;
        const t = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, [stagedMedia?.uri]);

    const { width: screenWidth } = useWindowDimensions();

    const isSmall = screenWidth <= 350;

    // Slim, WhatsApp-standard compact height (40px on small, 42px on standard/large)
    const barHeight = isSmall ? 40 : 42;
    // Enhanced mic / action button: minor size boost (46px on small, 48px on standard) for an engaging, prominent thumb target
    const actionSize = isSmall ? 46 : 48;
    const capsuleRadius = barHeight / 2;
    const actionMarginLeft = isSmall ? 6 : 7;
    const barPaddingHorizontal = isSmall ? 6 : 8;

    // Compact icon widths for maximum horizontal typing space
    const iconBtnWidth = isSmall ? 32 : 36;
    const iconSize = isSmall ? 20 : 22;
    const actionIconSize = isSmall ? 23 : 25;
    const inputFontSize = 15;
    const inputLineHeight = 20;
    const maxInputHeight = 110;

    const btnPress = useRef(new Animated.Value(1)).current;
    const onPressInAction = () => {
        Animated.spring(btnPress, { toValue: 0.90, friction: 6, tension: 300, useNativeDriver: true }).start();
    };
    const onPressOutAction = () => {
        Animated.spring(btnPress, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
    };

    const typTimer = useRef<any>(null);
    const sendScale = useRef(new Animated.Value(1)).current;
    // 0 = microphone showing, 1 = send showing (the two icons swap with a little spring)
    const swap = useRef(new Animated.Value(0)).current;
    const attachPress = useRef(new Animated.Value(0)).current;
    const [showEmoji, setShowEmoji] = useState(false);
    // the reply banner glides in each time a new message is picked for replying
    const bannerIn = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!replyingTo) return;
        bannerIn.setValue(0);
        Animated.spring(bannerIn, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true }).start();
    }, [replyingTo?.id]);
    // Message-bar colours: neutral icons, green send button (matches the WhatsApp look)
    const barIcon = '#AEBAC1';

    // The emoji panel takes the keyboard's place (same height), like WhatsApp
    const lastKb = useRef(300);
    useEffect(() => {
        const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
            lastKb.current = e.endCoordinates.height;
            setShowEmoji(false); // the keyboard is back, so the panel steps aside
        });
        return () => sub.remove();
    }, []);
    useEffect(() => {
        if (!showEmoji) return;
        const h = BackHandler.addEventListener('hardwareBackPress', () => {
            setShowEmoji(false);
            return true;
        });
        return () => h.remove();
    }, [showEmoji]);
    const attachOpen = !!attachPanel;
    useEffect(() => {
        if (!attachOpen) return;
        const h = BackHandler.addEventListener('hardwareBackPress', () => {
            onAttachClose?.();
            return true;
        });
        return () => h.remove();
    }, [attachOpen]);
    const toggleEmoji = () => {
        if (showEmoji) {
            // back to the keyboard; the panel leaves once the keyboard is up (fallback if it never shows)
            inputRef.current?.focus();
            setTimeout(() => setShowEmoji(false), 700);
        } else {
            Keyboard.dismiss();
            onAttachClose?.();
            setShowEmoji(true);
            onFocus?.();
        }
    };
    const removeLastChar = (t: string) => {
        const chars = Array.from(t);
        while (chars.length) {
            const c = chars.pop() as string;
            // also drop the invisible joiners / skin-tone modifiers that trail an emoji
            if (c !== '\uFE0F' && c !== '\u200D' && !/[\u{1F3FB}-\u{1F3FF}]/u.test(c)) break;
        }
        return chars.join('');
    };
    const panelHeight = Math.max(260, Math.min(lastKb.current, 400));

    const change = (t: string) => {
        setText(t);
        onTyping(t.length > 0);
        clearTimeout(typTimer.current);
        typTimer.current = setTimeout(() => onTyping(false), 2000);
    };

    // Emoji taps can arrive faster than the screen redraws, so build on the previous text (never a stale copy)
    const appendEmoji = (em: string) => {
        setText((prev) => prev + em);
        onTyping(true);
        clearTimeout(typTimer.current);
        typTimer.current = setTimeout(() => onTyping(false), 2000);
    };
    const backspaceEmoji = () => setText((prev) => removeLastChar(prev));

    const send = () => {
        const t = text.trim();
        if (!t && !stagedMedia && !editing) return;
        Animated.sequence([
            Animated.timing(sendScale, { toValue: 0.82, duration: 90, useNativeDriver: true }),
            Animated.spring(sendScale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
        ]).start();
        onText(t); // in edit mode parent saves, in staged parent sends media+caption, in text parent sends text
        setText('');
        onTyping(false);
    };

    const kp = (e: any) => {
        if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const hasText = text.trim().length > 0;
    const showSend = hasText || !!editing || !!stagedMedia;

    useEffect(() => {
        Animated.spring(swap, { toValue: showSend ? 1 : 0, friction: 7, tension: 130, useNativeDriver: true }).start();
    }, [showSend]);

    const replySnippet = replyingTo ? getMessageSnippet(replyingTo) : null;

    return (
        <View style={{ backgroundColor: theme.bg, width: '100%' }}>
            <View
                style={[
                    styles.inputBarWrap,
                    {
                        paddingHorizontal: barPaddingHorizontal,
                        paddingBottom: showEmoji || isKeyboardOpen || attachOpen ? 6 : Math.max(bottomInset, 8),
                        maxWidth: 700,
                        width: '100%',
                        alignSelf: 'center',
                    },
                ]}
            >
                <View
                    style={[
                        styles.inputCapsule,
                        {
                            backgroundColor: theme.inputBg,
                            borderRadius: capsuleRadius,
                            minHeight: barHeight,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                        },
                    ]}
                >
                    {/* Edit mode banner */}
                    {editing && (
                        <View style={[styles.editBannerMerged, { backgroundColor: 'rgba(32, 198, 90, 0.08)', borderColor: 'rgba(32, 198, 90, 0.22)', borderWidth: 1 }]}>
                            <View style={[styles.editBannerBar, { backgroundColor: '#20C65A' }]} />
                            <View style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 6 }}>
                                <Text style={[styles.editBannerTitle, { color: '#2BD96B' }]}>Editing message</Text>
                                <Text style={[styles.editBannerText, { color: theme.placeholder }]} numberOfLines={1}>{editing.text}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    hap();
                                    onCancelEdit?.();
                                }}
                                style={styles.editBannerClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityLabel="Cancel edit"
                            >
                                <CloseIcon size={16} color={theme.placeholder} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Reply preview banner (WhatsApp merged style) */}
                    {replyingTo && replySnippet && (
                        <Animated.View
                            style={[
                                styles.replyBannerMerged,
                                {
                                    backgroundColor: 'rgba(32, 198, 90, 0.08)',
                                    borderColor: 'rgba(32, 198, 90, 0.22)',
                                    borderWidth: 1,
                                    opacity: bannerIn,
                                    transform: [{ translateY: bannerIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                                },
                            ]}
                        >
                            {(() => {
                                const isReplyingToSelf = isOwnMessage(replyingTo, myId);
                                const repColor = REPLY_TEXT;
                                return (
                                    <>
                                        <View style={[styles.replyBannerBar, { backgroundColor: REPLY_BAR }]} />
                                        <View style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 6 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                <Text style={[styles.replyBannerTitle, { color: repColor }]} numberOfLines={1}>
                                                    {isReplyingToSelf ? 'You' : 'Anonymous'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.replyBannerText, { color: theme.placeholder }]} numberOfLines={1}>
                                                {replySnippet.text}
                                            </Text>
                                        </View>
                                    </>
                                );
                            })()}
                            {replyingTo.message_type === 'image' && replyingTo.media_public_url ? (
                                <Image source={{ uri: replyingTo.media_public_url }} style={styles.replyBannerThumb} resizeMode="cover" />
                            ) : null}
                            <TouchableOpacity
                                onPress={() => {
                                    hap();
                                    onCancelReply?.();
                                }}
                                style={styles.editBannerClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityLabel="Cancel reply"
                            >
                                <CloseIcon size={16} color={theme.placeholder} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Staged media preview card (WhatsApp merged style) */}
                    {stagedMedia && (
                        <View style={[styles.stagedMediaCardMerged, { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1 }]}>
                            <View style={[styles.stagedMediaIndicator, { backgroundColor: '#20C65A' }]} />
                            {stagedMedia.type === 'image' || stagedMedia.type === 'video' ? (
                                <View style={styles.stagedThumbWrap}>
                                    <Image source={{ uri: stagedMedia.uri }} style={styles.stagedThumb} resizeMode="cover" />
                                    {stagedMedia.type === 'video' && (
                                        <View style={styles.stagedVideoBadge}>
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>▶</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={[styles.stagedFileIconWrap, { backgroundColor: 'rgba(32, 198, 90, 0.15)' }]}>
                                    <Text style={[styles.stagedFileExt, { color: '#20C65A' }]}>
                                        {stagedMedia.type === 'audio' ? '🎵' : fileExtension(stagedMedia.fileName)}
                                    </Text>
                                </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.stagedFileName, { color: theme.inputText, fontSize: isSmall ? 12.5 : 13.5 }]} numberOfLines={1}>
                                    {stagedMedia.fileName}
                                </Text>
                                <Text style={[styles.stagedFileSub, { color: theme.placeholder, fontSize: isSmall ? 10 : 11 }]}>
                                    {stagedMedia.type.toUpperCase()}{stagedMedia.extras?.size ? ` • ${formatFileSize(stagedMedia.extras.size)}` : ''}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    hap();
                                    onCancelStagedMedia?.();
                                }}
                                style={styles.stagedCloseBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityLabel="Remove attachment"
                            >
                                <CloseIcon size={16} color={theme.placeholder} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Controls row: emoji / keyboard · text · paperclip · camera */}
                    <View style={[styles.inputControlsRow, { minHeight: barHeight }]}>
                        <TouchableOpacity
                            onPress={() => {
                                hap();
                                toggleEmoji();
                            }}
                            style={[styles.inputIcon, { width: iconBtnWidth, height: barHeight }]}
                            activeOpacity={0.65}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 2 }}
                            accessibilityLabel={showEmoji ? 'Show keyboard' : 'Emoji'}
                        >
                            {showEmoji ? <KeyboardIcon size={iconSize} color={barIcon} /> : <SmileyIcon size={iconSize} color={barIcon} />}
                        </TouchableOpacity>

                        <TextInput
                            ref={inputRef}
                            value={text}
                            onChangeText={change}
                            onKeyPress={kp}
                            onFocus={() => {
                                onAttachClose?.();
                                onFocus?.();
                            }}
                            underlineColorAndroid="transparent"
                            style={[
                                styles.inputField,
                                {
                                    color: theme.inputText,
                                    fontSize: inputFontSize,
                                    lineHeight: inputLineHeight,
                                    minHeight: barHeight - 8,
                                    maxHeight: maxInputHeight,
                                },
                            ]}
                            multiline
                            scrollEnabled={true}
                            maxLength={4000}
                        />

                        {/* Placeholder positioned dynamically based on responsive icon sizes */}
                        {text.length === 0 && (
                            <View
                                pointerEvents="none"
                                style={{
                                    position: 'absolute',
                                    left: iconBtnWidth + 4,
                                    right: (showSend || !onCamera ? iconBtnWidth : iconBtnWidth * 2) + 6,
                                    top: 0,
                                    bottom: 0,
                                    justifyContent: 'center',
                                }}
                            >
                                <Text
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.75}
                                    style={{
                                        fontSize: inputFontSize,
                                        color: theme.placeholder,
                                        letterSpacing: 0.1,
                                    }}
                                >
                                    {stagedMedia ? 'Add a caption...' : 'Type your message...'}
                                </Text>
                            </View>
                        )}

                        {/* Attach: slanted paperclip that tilts a little more while pressed */}
                        <TouchableOpacity
                            onPress={() => {
                                hap();
                                setShowEmoji(false);
                                onAttach();
                            }}
                            onPressIn={() => Animated.spring(attachPress, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }).start()}
                            onPressOut={() => Animated.spring(attachPress, { toValue: 0, friction: 5, tension: 160, useNativeDriver: true }).start()}
                            style={[styles.inputIcon, { width: iconBtnWidth, height: barHeight }]}
                            activeOpacity={0.8}
                            hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
                            accessibilityLabel="Add Attachment"
                        >
                            <Animated.View
                                style={{
                                    transform: [
                                        { rotate: attachPress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-20deg'] }) },
                                        { scale: attachPress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) },
                                    ],
                                }}
                            >
                                <WaAttachIcon size={iconSize} color={barIcon} />
                            </Animated.View>
                        </TouchableOpacity>

                        {/* Camera (hides while there is something to send, like WhatsApp) */}
                        {!showSend && onCamera && (
                            <TouchableOpacity
                                onPress={() => {
                                    hap();
                                    setShowEmoji(false);
                                    onAttachClose?.();
                                    onCamera();
                                }}
                                style={[styles.inputIcon, { width: iconBtnWidth, height: barHeight }]}
                                activeOpacity={0.65}
                                hitSlop={{ top: 6, bottom: 6, left: 2, right: 6 }}
                                accessibilityLabel="Camera"
                            >
                                <CameraOutlineIcon size={iconSize} color={barIcon} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Round green action button: microphone, turning into the send arrow when there is something to send */}
                <Animated.View
                    style={{
                        width: actionSize,
                        height: actionSize,
                        marginLeft: actionMarginLeft,
                        transform: [{ scale: btnPress }],
                    }}
                >
                    <Animated.View
                        pointerEvents={showSend ? 'none' : 'auto'}
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                opacity: swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                                transform: [
                                    { scale: swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
                                    { rotate: swap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
                                ],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                hap();
                                onVoice();
                            }}
                            onPressIn={onPressInAction}
                            onPressOut={onPressOutAction}
                            activeOpacity={0.88}
                            style={[
                                styles.waCircle,
                                {
                                    borderRadius: actionSize / 2,
                                },
                            ]}
                            accessibilityLabel="Record Voice"
                        >
                            <WaMicIcon size={actionIconSize} color="#FFFFFF" />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View
                        pointerEvents={showSend ? 'auto' : 'none'}
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                opacity: swap,
                                transform: [
                                    { scale: Animated.multiply(swap.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), sendScale) },
                                    { rotate: swap.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
                                ],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                hap();
                                send();
                            }}
                            onPressIn={onPressInAction}
                            onPressOut={onPressOutAction}
                            activeOpacity={0.88}
                            style={[
                                styles.waCircle,
                                {
                                    borderRadius: actionSize / 2,
                                    opacity: (hasText || stagedMedia || editing) ? 1 : 0.5,
                                },
                            ]}
                            accessibilityLabel={editing ? 'Save edited message' : 'Send Message'}
                        >
                            {editing ? (
                                <CheckmarkIcon size={Math.round(actionIconSize * 0.95)} color="#FFFFFF" />
                            ) : (
                                <WaSendIcon size={actionIconSize} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </View>

            {showEmoji && (
                <EmojiPanel
                    height={panelHeight + bottomInset}
                    theme={theme}
                    bottomInset={bottomInset}
                    onPick={appendEmoji}
                    onBackspace={backspaceEmoji}
                />
            )}

            {attachPanel}
        </View>
    );
}

// ──────────────────── TYPING INDICATOR ────────────────────
function TypingBubble({ theme, typers }: { theme: typeof DARK; typers: Typer[] }) {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    const enter = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(enter, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
        const loops = dots.map((d, i) =>
            Animated.loop(Animated.sequence([
                Animated.delay(i * 150),
                Animated.timing(d, { toValue: -6, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.delay((2 - i) * 150),
            ]))
        );
        loops.forEach((l) => l.start());
        return () => loops.forEach((l) => l.stop());
    }, []);

    const label =
        typers.length === 1 ? 'Someone is typing…'
            : typers.length === 2 ? '2 members are typing…'
                : `${typers.length} members are typing…`;

    return (
        <Animated.View
            style={[
                styles.typingRow,
                {
                    opacity: enter,
                    transform: [
                        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                        { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                    ],
                },
            ]}
        >
            <View style={[styles.typingWrap, { backgroundColor: theme.inBubble, borderColor: theme.border }]}>
                <View style={styles.typingDotsRow}>
                    {dots.map((d, i) => (
                        <Animated.View key={i} style={[styles.typingDot, { backgroundColor: theme.accent, transform: [{ translateY: d }] }]} />
                    ))}
                </View>
                <Text style={[styles.typingLabel, { color: theme.placeholder }]} numberOfLines={1}>{label}</Text>
            </View>
        </Animated.View>
    );
}

const PERMS_KEY = '@skfl_permissions_v1';



// ──────────────────── INNER CHAT APPLICATION ────────────────────
function ChatAppInner() {
    const insets = useSafeAreaInsets();
    const theme = DARK; // dark is the only theme

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    // Bottom padding of the chat root; animated so the message bar glides up with the keyboard
    const kbLift = useRef(new Animated.Value(0)).current;
    const rootHeightRef = useRef(0); // laid-out height of the chat root (its bottom edge, edge-to-edge)
    const kbTopRef = useRef<number | null>(null); // screen Y of the keyboard's top edge while it is open

    // Safe-area handling. The app draws edge-to-edge (behind the status bar and the system
    // navigation bar), so the real insets — camera cut-out / status bar on top, gesture pill or
    // 3-button bar at the bottom — are added as padding and adapt to whatever the phone has.
    // If Android reports no top inset, fall back to the status bar height.
    const androidStatusBar = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
    const topInset = Math.max(insets.top, androidStatusBar) + 8;
    // Breathing room between the message bar and the system navigation bar / home indicator
    const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom - 8, 10) : insets.bottom + 12;

    const [identity, setIdentity] = useState<AnonymousIdentity | null>(null);
    const [myClientIds, setMyClientIds] = useState<Set<string>>(new Set());
    const [mySentIds, setMySentIds] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<SkflMessage[]>([]);

    // Immediate identity & sender history loader (prevents messages showing on wrong side on reload)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [ident, clientIds, sentIds] = await Promise.all([
                    getIdentity(),
                    getAllMyClientIds(),
                    getSentMessageIds(),
                ]);
                if (alive) {
                    setIdentity(ident);
                    identityRef.current = ident;
                    setMyClientIds(clientIds);
                    setMySentIds(sentIds);
                }
            } catch (e) {
                console.warn('[identity loader error]', e);
            }
        })();
        return () => { alive = false; };
    }, []);
    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);
    const [typers, setTypers] = useState<Typer[]>([]);
    const [unseenCount, setUnseenCount] = useState(0);
    // The round scroll-to-bottom button: shown whenever the user has scrolled up, not only when there are unseen messages
    const [showScrollDown, setShowScrollDown] = useState(false);
    // Message actions: WhatsApp header selection mode, 3-dots popup, in-place editing, and pinned messages
    // Long-press selects a message; while any are selected a tap adds / removes more (like WhatsApp)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedMsgs = useMemo(() => messages.filter((m) => selectedIdSet.has(m.id)), [messages, selectedIdSet]);
    const selectionActive = selectedMsgs.length > 0;
    /** the one selected message: set only when exactly one is selected, for actions that make no sense on several (edit, pin, info) */
    const selectedMsg = selectedMsgs.length === 1 ? selectedMsgs[0] : null;
    const clearSelection = useCallback(() => setSelectedIds([]), []);
    const toggleSelected = (m: SkflMessage) =>
        setSelectedIds((prev) => (prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]));
    const [showThreeDots, setShowThreeDots] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [toastText, setToastText] = useState('');
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const showToast = useCallback((msgText: string) => {
        setToastText(msgText);
        toastOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => setToastText(''));
    }, []);

    // Load pinned ids from AsyncStorage on mount
    useEffect(() => {
        AsyncStorage.getItem('skfl_pinned_ids').then((raw) => {
            if (raw) {
                try {
                    const arr = JSON.parse(raw);
                    if (Array.isArray(arr)) setPinnedIds(new Set(arr));
                } catch (_) { }
            }
        }).catch(() => { });
    }, []);

    const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
    const [replyingTo, setReplyingTo] = useState<SkflMessage | null>(null);
    const [stagedMedia, setStagedMedia] = useState<StagedMedia | null>(null);
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        loadHiddenIds().then(setHiddenIds);
    }, []);
    const chipRef = useRef<FloatingChipHandle | null>(null);
    // Bumped when the live connection returns after a drop, to trigger an immediate catch-up
    const [syncTick, setSyncTick] = useState(0);

    // Older-message paging
    const [loadingOlder, setLoadingOlder] = useState(false);

    // Modal states
    const [showAttach, setShowAttach] = useState(false);
    const [showPoll, setShowPoll] = useState(false);
    const [showEvent, setShowEvent] = useState(false);
    const [showInspect, setShowInspect] = useState(false);
    const [lbVisible, setLbVisible] = useState(false);
    const [lbUrl, setLbUrl] = useState('');
    const [lbType, setLbType] = useState<'image' | 'video' | 'file'>('image');
    const [lbMsg, setLbMsg] = useState<SkflMessage | null>(null);

    const listRef = useRef<FlatList>(null);
    const typingSessionRef = useRef<TypingSession | null>(null);
    // id → arrival time of messages that came in live, so only those play the entrance animation
    const freshRef = useRef<Map<string, number>>(new Map());
    const unseenRef = useRef(0);
    const initializingRef = useRef(false);
    const initializedRef = useRef(false);
    const unsubRef = useRef<(() => void) | null>(null);
    const unsubReceiptsRef = useRef<(() => void) | null>(null);

    // Paging / scroll bookkeeping
    const hasMoreRef = useRef(true);
    const loadingOlderRef = useRef(false);
    const stickToBottomRef = useRef(true);
    const userScrolledRef = useRef(false);
    const layoutHeightRef = useRef(0);
    const isVotingRef = useRef(false);
    const voteSeqRef = useRef<Map<string, number>>(new Map());
    const lastVoteTimeRef = useRef<Map<string, number>>(new Map());
    // The list stays hidden until it has measured itself and settled on the newest message
    const listReadyRef = useRef(false);
    const readyTimer = useRef<any>(null);
    const [listReady, setListReady] = useState(false);
    const loadOlderRef = useRef<((force?: boolean) => void) | null>(null);
    const messagesRef = useRef<SkflMessage[]>([]);
    const identityRef = useRef<AnonymousIdentity | null>(null);
    const appActiveRef = useRef(AppState.currentState === 'active');
    const [appActive, setAppActive] = useState(AppState.currentState === 'active');

    messagesRef.current = messages;
    identityRef.current = identity;

    // Jump to the newest message (used for our own sends, text input focus, and keyboard lift)
    const scrollBottom = useCallback((immediate = false) => {
        stickToBottomRef.current = true;
        // Always snap immediately first so the message is never hidden under the bar
        try { listRef.current?.scrollToEnd({ animated: false }); } catch (_) { }
        if (!immediate) {
            try { listRef.current?.scrollToEnd({ animated: true }); } catch (_) { }
        }
        // Staggered retries — bail out if user scrolled away or is interacting (voting/selecting)
        const delays = [60, 160, 300, 500, 700];
        delays.forEach((d) => {
            setTimeout(() => {
                // Don't yank the list if user has scrolled up or is in the middle of a poll vote
                if (!stickToBottomRef.current || isVotingRef.current) return;
                try { listRef.current?.scrollToEnd({ animated: false }); } catch (_) { }
            }, d);
        });
    }, []);

    // Keep the list pinned to the bottom as content grows (new messages, images loading) —
    // but only while the user is at the bottom, and never yank the view while user votes.
    const onContentSizeChange = useCallback((_w: number, h: number) => {
        if (isVotingRef.current) return;

        // First open: keep jumping to the newest message while the list is still measuring itself, and only
        // show it once its size has stopped changing, so it never opens halfway up.
        if (!listReadyRef.current) {
            if (h <= 0) return;
            listRef.current?.scrollToEnd({ animated: false });
            clearTimeout(readyTimer.current);
            readyTimer.current = setTimeout(() => {
                listReadyRef.current = true;
                listRef.current?.scrollToEnd({ animated: false }); // one last jump to the newest message before it is shown
                setListReady(true);
            }, 320);
            return;
        }

        if (stickToBottomRef.current) {
            listRef.current?.scrollToEnd({ animated: false });
            // Extra delayed scroll — guard: skip if user scrolled away or is voting
            setTimeout(() => {
                if (!stickToBottomRef.current || isVotingRef.current) return;
                try { listRef.current?.scrollToEnd({ animated: false }); } catch (_) { }
            }, 350);
        }
        // A short conversation that doesn't fill the screen can't be scrolled up, so
        // keep pulling older pages until it does (or there is nothing older left).
        if (h > 0 && h < layoutHeightRef.current) loadOlderRef.current?.(true);
    }, []);

    // Safety net: an empty chat (or a list that never reports a size) still gets shown
    useEffect(() => {
        if (loading) return;
        const t = setTimeout(() => {
            if (!listReadyRef.current) {
                listReadyRef.current = true;
                setListReady(true);
                listRef.current?.scrollToEnd({ animated: false });
            }
        }, 1500);
        return () => clearTimeout(t);
    }, [loading]);

    const onListScroll = useCallback((e: any) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        stickToBottomRef.current = distanceFromBottom < 160;
        // Floating day chip: appears while scrolling, fades out shortly after it stops (its own state, no re-render here)
        chipRef.current?.pulse();
        if (stickToBottomRef.current && unseenRef.current > 0) {
            unseenRef.current = 0;
            setUnseenCount(0);
        }
        // Round scroll-to-bottom button: only once scrolled up a good distance, so it doesn't flicker near the bottom
        setShowScrollDown((prev) => {
            const next = distanceFromBottom > 400;
            return prev === next ? prev : next;
        });
    }, []);

    // A message from someone else has arrived live: animate it in, buzz, and either follow it
    // down (if the user is reading the latest messages) or offer a "new messages" jump button.
    const onIncoming = useCallback((all: SkflMessage[], senderIds: string[]) => {
        // Realtime and the catch-up poll can both deliver the same message — only react once
        const incoming = all.filter((m) => !freshRef.current.has(m.id));
        if (incoming.length === 0) return;
        const now = Date.now();
        incoming.forEach((m) => freshRef.current.set(m.id, now));
        setTypers((prev) => prev.filter((t) => !senderIds.includes(t.clientId)));
        hap();
        if (stickToBottomRef.current) {
            scrollBottom();
        } else {
            unseenRef.current += incoming.length;
            setUnseenCount(unseenRef.current);
        }
    }, [scrollBottom]);

    // Track which day is at the top of the screen for the floating chip
    const onViewableRef = useRef(({ viewableItems }: any) => {
        const items = (viewableItems || []).map((v: any) => v.item).filter(Boolean);
        const first = items[0];
        if (!first) return;
        const label = first.kind === 'date' ? first.label : dayLabel(first.msg.created_at);
        // The real separator for that day is already on screen, so the floating copy steps aside at once —
        // otherwise "Today" would show twice until the floating one faded out
        const shownInline = items.some((i: any) => i.kind === 'date' && i.label === label);
        chipRef.current?.setLabel(shownInline ? '' : label);
    });
    const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 10 });

    const jumpToLatest = (immediate = false) => {
        unseenRef.current = 0;
        setUnseenCount(0);
        setShowScrollDown(false);
        scrollBottom(immediate);
    };

    // Track foreground/background so messages are only marked "seen" while the chat is on screen
    useEffect(() => {
        const sub = AppState.addEventListener('change', (s) => {
            appActiveRef.current = s === 'active';
            setAppActive(s === 'active');
        });
        return () => sub.remove();
    }, []);

    // Merge freshly loaded messages into the list (dedupe by id, keep chronological order)
    const mergeMessages = (prev: SkflMessage[], incoming: SkflMessage[]) => {
        const seen = new Set(prev.map((m) => m.id));
        const fresh = incoming.filter((m) => !seen.has(m.id));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    };

    // Load the next 30 older messages when the user scrolls up to the top
    const loadOlder = useCallback(async (force = false) => {
        // Ignore the list's initial "at the top" callback before the user has actually scrolled
        if (!force && !userScrolledRef.current) return;
        if (loadingOlderRef.current || !hasMoreRef.current) return;
        const oldest = messagesRef.current.find((m) => !m.id.startsWith('opt_'));
        if (!oldest) return;
        loadingOlderRef.current = true;
        setLoadingOlder(true);
        try {
            const page = await fetchMessagesPage(oldest.created_at);
            if (!page.ok) return;
            hasMoreRef.current = page.hasMore;
            if (page.messages.length > 0) {
                stickToBottomRef.current = false;
                setMessages((prev) => mergeMessages(prev, page.messages));
            }
        } finally {
            loadingOlderRef.current = false;
            setLoadingOlder(false);
        }
    }, []);

    loadOlderRef.current = loadOlder;

    // Keyboard: lift the whole chat by exactly the part of the screen the keyboard covers.
    //   covered = (bottom edge of the chat) - (top edge of the keyboard)
    // The chat fills the window edge-to-edge, so its bottom edge is its laid-out height, and the keyboard's
    // top edge comes straight from the OS event. (measureInWindow is NOT used: on Android it comes back shifted
    // by the status-bar height, which left the message bar half hidden.) If the OS already shrank the window the
    // chat got shorter and the result is ~0, so this is right whether or not the window resizes, and it is
    // recomputed whenever the keyboard's height or the chat's height changes.
    const updateKbLift = useCallback((duration = 160) => {
        const top = kbTopRef.current;
        const covered = top == null ? 0 : Math.max(0, Math.round(rootHeightRef.current - top));
        if (duration <= 0) {
            kbLift.setValue(covered);
            return;
        }
        Animated.timing(kbLift, {
            toValue: covered,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, []);

    useEffect(() => {
        const onKbShow = (e: any) => {
            setKeyboardVisible(true);
            const top = Number.isFinite(e?.endCoordinates?.screenY)
                ? e.endCoordinates.screenY
                : Dimensions.get('screen').height - (e?.endCoordinates?.height || 300);
            kbTopRef.current = top;
            const dur = Platform.OS === 'ios' && e?.duration ? e.duration : 160;
            updateKbLift(dur);
            // Snap to bottom immediately so newest messages don't drop behind keyboard/bar
            scrollBottom(true);
        };
        const onKbHide = (e: any) => {
            setKeyboardVisible(false);
            kbTopRef.current = null;
            const dur = Platform.OS === 'ios' && e?.duration ? e.duration : 160;
            updateKbLift(dur);
            if (stickToBottomRef.current) {
                setTimeout(() => {
                    scrollBottom(false);
                }, dur + 40);
            }
        };

        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            onKbShow
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            onKbHide
        );
        let willShowSub: any = null;
        let willHideSub: any = null;
        if (Platform.OS === 'android') {
            try {
                willShowSub = Keyboard.addListener('keyboardWillShow', onKbShow);
                willHideSub = Keyboard.addListener('keyboardWillHide', onKbHide);
            } catch (_) { }
        }
        return () => {
            showSub.remove();
            hideSub.remove();
            willShowSub?.remove();
            willHideSub?.remove();
        };
    }, [updateKbLift, scrollBottom]);

    // Keep typing indicator and newest messages cleanly in view when someone starts typing
    useEffect(() => {
        if (typers.length > 0 && stickToBottomRef.current) {
            scrollBottom(false);
        }
    }, [typers.length, scrollBottom]);

    // Everyone who reaches this screen has signed in with the Master login (see AuthGate),
    // so the chat starts straight away — there is no network check any more.
    useEffect(() => {
        initApp();
    }, []);

    const initApp = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;
        try {
            const [ident, clientIds, sentIds] = await Promise.all([
                getIdentity(),
                getAllMyClientIds(),
                getSentMessageIds(),
            ]);
            setIdentity(ident);
            identityRef.current = ident;
            setMyClientIds(clientIds);
            setMySentIds(sentIds);
            await markClientIdAsMine(ident.clientId);

            // First launch: the phone's own permission dialogs appear one after another
            // (microphone, camera, photos, contacts), then notifications. After that, it just works.
            if (Platform.OS === 'web') {
                startNotifications(ident);
            } else {
                AsyncStorage.getItem(PERMS_KEY)
                    .then(async (done) => {
                        if (!done) {
                            await requestFirstLaunchPermissions();
                            AsyncStorage.setItem(PERMS_KEY, '1').catch(() => { });
                        }
                        startNotifications(ident);
                    })
                    .catch(() => startNotifications(ident));
            }

            // Newest 30 first; older pages load as the user scrolls up
            let page = await fetchMessagesPage();
            for (let attempt = 1; !page.ok && attempt <= 3; attempt++) {
                await new Promise((r) => setTimeout(r, 1500 * attempt));
                page = await fetchMessagesPage();
            }
            hasMoreRef.current = page.hasMore;
            setMessages(page.messages);
            setLoading(false);
            scrollBottom();

            // Clean up previous subscription before re-subscribing
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }

            // Supabase Realtime subscribe
            const unsub = subscribeToMessages((newMsg) => {
                // Our own sends are already in the list (optimistic bubble → saved row)
                if (isOwnMessage(newMsg, ident.clientId, clientIds, sentIds)) return;
                if (messagesRef.current.some(m => m.id === newMsg.id)) return;
                setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : mergeMessages(prev, [newMsg])));
                onIncoming([newMsg], [newMsg.sender_client_id]);
                notifyBackgroundMessage(newMsg); // only fires when the app is in the background
            }, {
                // Someone edited / deleted-for-everyone / voted on a message, or a row was removed in Supabase
                onUpdate: (row) => setMessages(prev => prev.map(m => {
                    if (m.id !== row.id) return m;
                    const lastVote = lastVoteTimeRef.current.get(m.id) ?? 0;
                    if (Date.now() - lastVote < 2500) {
                        return { ...m, ...row, responses: m.responses };
                    }
                    return { ...m, ...row };
                })),
                onDelete: (id) => setMessages(prev => prev.filter(m => m.id !== id)),
                // Connection came back after a drop: catch up on anything missed right away
                onReconnect: () => setSyncTick(t => t + 1),
            });

            unsubRef.current = unsub;

            // Live "typing…" between phones
            if (typingSessionRef.current) typingSessionRef.current.leave();
            typingSessionRef.current = joinTyping(
                { clientId: ident.clientId, badge: ident.badge, avatarColor: ident.avatarColor },
                setTypers
            );


            initializedRef.current = true;
        } catch (err) {
            console.error('[initApp error]', err);
        } finally {
            initializingRef.current = false;
        }
    };

    useEffect(() => {
        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
            if (unsubReceiptsRef.current) {
                unsubReceiptsRef.current();
                unsubReceiptsRef.current = null;
            }
            if (typingSessionRef.current) {
                typingSessionRef.current.leave();
                typingSessionRef.current = null;
            }
        };
    }, []);

    // Safety net so messages always show up promptly even if the realtime socket dropped
    // (weak WiFi, phone was asleep): on returning to the app and every few seconds, pull anything
    // newer than what we already have from other people.
    useEffect(() => {
        if (!identity || !appActive) return;
        const catchUp = async () => {
            const saved = messagesRef.current.filter((m) => !m.id.startsWith('opt_'));
            const newest = saved[saved.length - 1];
            if (!newest) {
                // Empty chat: either it really is empty, or the first load failed. Look again, quietly.
                const first = await fetchMessagesPage();
                if (first.ok && first.messages.length > 0) {
                    hasMoreRef.current = first.hasMore;
                    setMessages((prev) => mergeMessages(prev, first.messages));
                    scrollBottom();
                }
                return;
            }
            const rows = (await fetchMessagesAfter(newest.created_at)).filter(
                (m) => !isOwnMessage(m, identity.clientId, myClientIds, mySentIds) && !messagesRef.current.some((x) => x.id === m.id)
            );
            if (rows.length > 0) {
                setMessages((prev) => mergeMessages(prev, rows));
                onIncoming(rows, rows.map((m) => m.sender_client_id));
                rows.forEach((r) => notifyBackgroundMessage(r));
            }

            // Reconcile the most recent messages with the table: pick up edits / deletions that the
            // realtime connection missed, and drop rows that were removed from the table.
            const windowMsgs = saved.slice(-60);
            const current = await fetchMessagesByIds(windowMsgs.map((m) => m.id));
            if (!current) return;
            const byId = new Map(current.map((r) => [r.id, r]));
            if (current.length === 0) {
                // Nothing came back: only trust that if the newest page is really empty too
                const check = await fetchMessagesPage();
                if (!check.ok || check.messages.length > 0) return;
            }
            const inWindow = new Set(windowMsgs.map((m) => m.id));
            setMessages((prev) => {
                let changed = false;
                const next: SkflMessage[] = [];
                for (const m of prev) {
                    if (m.id.startsWith('opt_') || !inWindow.has(m.id)) {
                        next.push(m);
                        continue;
                    }
                    const r = byId.get(m.id);
                    if (!r) {
                        changed = true; // deleted from the table
                        continue;
                    }
                    if (
                        r.edited_at !== m.edited_at || r.deleted_at !== m.deleted_at || r.content !== m.content ||
                        JSON.stringify(r.responses) !== JSON.stringify(m.responses)
                    ) {
                        changed = true;
                        const lastVote = lastVoteTimeRef.current.get(m.id) ?? 0;
                        if (Date.now() - lastVote < 2500) {
                            next.push({ ...m, ...r, responses: m.responses });
                        } else {
                            next.push({ ...m, ...r });
                        }
                    } else {
                        next.push(m);
                    }
                }
                return changed ? next : prev;
            });
        };
        catchUp();
        const t = setInterval(catchUp, 9000);
        return () => clearInterval(t);
    }, [identity, appActive, onIncoming, syncTick]);

    // Send text
    // Save a message row; if it fails (weak Wi-Fi) try once more before giving up
    const saveWithRetry = async (save: () => Promise<SkflMessage | null>): Promise<SkflMessage | null> => {
        const first = await save();
        if (first) return first;
        await new Promise((r) => setTimeout(r, 1500));
        return save();
    };

    const sendText = async (text: string) => {
        if (!identity) return;
        hap();
        // Optimistic insert
        const opt: SkflMessage = {
            id: 'opt_' + Date.now(),
            message_type: 'text', content: text,
            sender_badge: identity.badge, sender_avatar_color: identity.avatarColor, sender_client_id: identity.clientId,
            media_file_name: null, media_original_name: null, media_file_size: null, media_mime_type: null,
            media_storage_path: null, media_public_url: null, media_width: null, media_height: null, media_duration_ms: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        freshRef.current.set(opt.id, Date.now());
        stickToBottomRef.current = true;
        setMessages(p => [...p, opt]);
        scrollBottom(true);
        // RAF ensures the FlatList has committed the new row before the final scroll
        requestAnimationFrame(() => {
            try { listRef.current?.scrollToEnd({ animated: false }); } catch (_) { }
        });

        const saved = await saveWithRetry(() => insertMessage(identity, 'text', text));
        if (saved) {
            markMessageAsSentByMe(saved.id).catch(() => {});
            setMySentIds((prev) => new Set(prev).add(saved.id));
            setMessages(p => p.map(m => m.id === opt.id ? saved : m));
        } else {
            // never leave a message stuck on the "sending" clock
            setMessages(p => p.filter(m => m.id !== opt.id));
            showToast('Message not sent. Check your connection and try again.');
        }
    };

    // Upload & send media
    const sendMedia = async (
        uri: string, fileName: string, mimeType: string, type: SkflMessage['message_type'],
        extras: { width?: number; height?: number; durationMs?: number; size?: number } = {},
        customContent?: string | null
    ) => {
        if (!identity) return;
        hap();

        const initialContent = customContent !== undefined ? customContent : (type !== 'text' ? fileName : null);

        // Instant optimistic preview bubble in chat
        const optId = 'opt_' + Date.now();
        const opt: SkflMessage = {
            id: optId,
            message_type: type,
            content: initialContent,
            sender_badge: identity.badge,
            sender_avatar_color: identity.avatarColor,
            sender_client_id: identity.clientId,
            media_file_name: fileName,
            media_original_name: fileName,
            media_file_size: extras.size || null,
            media_mime_type: mimeType,
            media_storage_path: null,
            media_public_url: uri,
            media_width: extras.width || null,
            media_height: extras.height || null,
            media_duration_ms: extras.durationMs || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        markMediaReady(optId, uri);
        stickToBottomRef.current = true;
        setMessages(p => [...p, opt]);
        scrollBottom(true);
        requestAnimationFrame(() => {
            try { listRef.current?.scrollToEnd({ animated: false }); } catch (_) { }
        });

        // The bubble shows a round green progress ring while the file goes out (no banner)
        setUploadProgress(optId, 0);
        try {
            const uploaded = await uploadMediaToStorage(uri, fileName, mimeType, (f) => setUploadProgress(optId, f));
            if (!uploaded) {
                setMessages(p => p.filter(m => m.id !== optId));
                const ext = (fileName || '').split('.').pop()?.toUpperCase() ?? '';
                alert(
                    `Upload failed for "${fileName}".\n\n` +
                    (ext ? `The .${ext} format may not be supported by the server, or ` : '') +
                    'please check your network connection and try again.'
                );
                return;
            }

            setUploadProgress(optId, 1);
            const doneAt = Date.now();
            const saved = await saveWithRetry(() => insertMessage(
                identity, type,
                initialContent,
                {
                    file_name: uploaded.storagePath,
                    original_name: fileName,
                    file_size: extras.size ?? uploaded.size,
                    mime_type: mimeType,
                    storage_path: uploaded.storagePath,
                    public_url: uploaded.publicUrl,
                    width: extras.width,
                    height: extras.height,
                    duration_ms: extras.durationMs,
                }
            ));
            // Let the completed ring show for a beat, then the bubble turns into the sent message with its double tick
            const wait = 400 - (Date.now() - doneAt);
            if (wait > 0) await new Promise((r) => setTimeout(r, wait));
            if (saved) {
                markMessageAsSentByMe(saved.id).catch(() => {});
                setMySentIds((prev) => new Set(prev).add(saved.id));
                cacheSenderMedia(saved, uri).catch(() => {});
                setMessages(p => p.map(m => m.id === optId ? saved : m));
                scrollBottom();
            } else {
                setMessages(p => p.filter(m => m.id !== optId));
                showToast('Could not send the file. Check your connection and try again.');
            }
        } finally {
            clearUploadProgress(optId);
        }
    };

    const pickGallery = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });
        if (!res.canceled && res.assets?.[0]) {
            const a = res.assets[0];
            const isVid = a.type === 'video';
            const name = a.fileName || (isVid ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
            setStagedMedia({
                uri: a.uri,
                fileName: name,
                mimeType: isVid ? 'video/mp4' : 'image/jpeg',
                type: isVid ? 'video' : 'image',
                extras: { width: a.width, height: a.height, durationMs: a.duration ? a.duration * 1000 : undefined }
            });
        }
    };

    const pickDocument = async () => {
        const res = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (res.canceled || !res.assets?.[0]) return;
        const f = res.assets[0];

        const resolvedMime = f.mimeType || 'application/octet-stream';
        const ext = (f.name || '').split('.').pop()?.toLowerCase() ?? '';
        const mimeIsTextOnly = resolvedMime.startsWith('text/') && !ext;
        if (mimeIsTextOnly) {
            alert(`"${f.name}" cannot be uploaded.\n\nPlain-text files without an extension are not supported. Rename the file with the correct extension (e.g. .txt, .csv) and try again.`);
            return;
        }

        setStagedMedia({
            uri: f.uri,
            fileName: f.name,
            mimeType: resolvedMime,
            type: 'file',
            extras: { size: f.size ?? undefined }
        });
    };

    // Camera: take a photo or short video and stage it
    const pickCamera = async () => {
        if (Platform.OS === 'web') {
            alert('The camera is available in the phone app.');
            return;
        }
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            alert('Camera permission is needed. Please allow it in your phone Settings.');
            return;
        }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 60 });
        if (!res.canceled && res.assets?.[0]) {
            const a = res.assets[0];
            const isVid = a.type === 'video';
            const name = a.fileName || (isVid ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
            setStagedMedia({
                uri: a.uri,
                fileName: name,
                mimeType: isVid ? 'video/mp4' : 'image/jpeg',
                type: isVid ? 'video' : 'image',
                extras: { width: a.width, height: a.height, durationMs: a.duration ? a.duration * 1000 : undefined }
            });
        }
    };

    // Audio: import an existing audio file from the device and stage it
    const pickAudio = async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
        if (!res.canceled && res.assets?.[0]) {
            const f = res.assets[0];
            setStagedMedia({
                uri: f.uri,
                fileName: f.name,
                mimeType: f.mimeType || 'audio/mpeg',
                type: 'audio',
                extras: { size: f.size }
            });
        }
    };

    // Contact: pick from the phone's contacts and share it as a card
    const pickContact = async () => {
        if (Platform.OS === 'web') {
            alert('Sharing a contact is available in the phone app.');
            return;
        }
        try {
            const Contacts = require('expo-contacts/legacy');
            const perm = await Contacts.requestPermissionsAsync();
            if (perm && perm.granted === false) {
                alert('Contacts permission is needed to share a contact. Please allow it in your phone Settings.');
                return;
            }
            const c = await Contacts.presentContactPickerAsync();
            if (!c) return;
            const name = (c.name || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim() || 'Contact';
            const phones: string[] = (c.phoneNumbers || []).map((x: any) => x.number).filter(Boolean);
            const emails: string[] = (c.emails || []).map((x: any) => x.email).filter(Boolean);
            await sendText(encodeRich({ kind: 'contact', name, phones, emails: emails.length ? emails : undefined }));
        } catch (e) {
            console.warn('[Contact] picker failed:', e);
            alert('Could not open your contacts.');
        }
    };

    // Poll / event created in the composer dialogs
    const sendRich = (payload: RichPayload) => {
        setShowPoll(false);
        setShowEvent(false);
        sendText(encodeRich(payload));
    };

    // Vote in a poll / answer an event RSVP (tap again to withdraw)
    const onVote = async (m: SkflMessage, choice: string) => {
        if (!identity || m.id.startsWith('opt_')) return;
        isVotingRef.current = true;
        setTimeout(() => { isVotingRef.current = false; }, 800);

        const rich = parseRich(m.content);
        if (rich?.kind !== 'poll' && rich?.kind !== 'event') return;
        const multi = rich.kind === 'poll' && rich.multi;

        // Sequence number & timestamp: guards against out-of-order network responses & realtime echoes
        const seq = (voteSeqRef.current.get(m.id) ?? 0) + 1;
        voteSeqRef.current.set(m.id, seq);
        lastVoteTimeRef.current.set(m.id, Date.now());

        // Instant optimistic update (zero lag, previous clean approach)
        setMessages((prev) =>
            prev.map((x) =>
                x.id === m.id
                    ? { ...x, responses: withVote(x, identity.clientId, choice, multi) }
                    : x
            )
        );

        try {
            const res = await castResponse(m.id, identity.clientId, choice);
            // Only update from server if no newer tap happened while this request was in flight
            if (voteSeqRef.current.get(m.id) === seq) {
                if (res.ok && res.message?.responses) {
                    const savedResponses = res.message.responses;
                    setMessages((prev) =>
                        prev.map((x) => (x.id === m.id ? { ...x, responses: savedResponses } : x))
                    );
                } else if (!res.ok) {
                    // Revert on error if still on this sequence
                    setMessages((prev) =>
                        prev.map((x) => (x.id === m.id ? { ...x, responses: m.responses } : x))
                    );
                    alert('Could not save your vote. Check your connection and try again.');
                }
            }
        } catch (e) {
            console.warn('[onVote error]', e);
        }
    };

    const sendVoice = async (uri: string, ms: number) => {
        setRecording(false);
        const web = Platform.OS === 'web';
        const currentReply = replyingTo;
        setReplyingTo(null);
        let finalContent: string | null = null;
        if (currentReply) {
            const snippet = getMessageSnippet(currentReply);
            finalContent = encodeRich({
                kind: 'reply',
                replyTo: {
                    id: currentReply.id,
                    sender_badge: currentReply.sender_badge,
                    sender_client_id: currentReply.sender_client_id,
                    sender_avatar_color: currentReply.sender_avatar_color,
                    text: snippet.text,
                    message_type: currentReply.message_type,
                    media_url: snippet.media_url,
                },
                text: '',
            });
        }
        await sendMedia(
            uri,
            `voice_${Date.now()}.${web ? 'webm' : 'm4a'}`,
            web ? 'audio/webm' : 'audio/m4a',
            'audio',
            { durationMs: ms },
            finalContent
        );
    };

    // Someone else's photo / video / voice note: fetch it on tap (the bubble shows the download button + size)
    const onDownloadMedia = (m: SkflMessage) => {
        if (selectionActive) {
            onPressMsg(m);
            return;
        }
        hap();
        downloadMedia(m).then((uri: string | null) => {
            if (!uri) showToast('Download failed. Check your connection and try again.');
        });
    };

    // Documents and videos open in the phone's own apps (the "Open with" list), never in the browser
    const onOpenFile = (m: SkflMessage) => {
        if (selectionActive) {
            onPressMsg(m);
            return;
        }
        hap();
        const isSelf = isOwnMessage(m, identity?.clientId, myClientIds, mySentIds);
        if (!isSelf && getMediaState(m.id).status !== 'ready') {
            showToast('Downloading…');
        }
        openInPhone(m).then((r: { ok: boolean; message: string }) => {
            if (!r.ok && r.message) showToast(r.message);
        });
    };

    const openMedia = (url: string, type: 'image' | 'video' | 'file', msg: SkflMessage) => {
        // while selecting, tapping a photo / video selects it instead of opening it
        if (selectionActive) {
            onPressMsg(msg);
            return;
        }
        if (type !== 'image') {
            onOpenFile(msg);
            return;
        }
        setLbUrl(url); setLbType(type); setLbMsg(msg); setLbVisible(true);
    };

    const doClear = async () => {
        await clearAllMessages();
        setMessages([]);
        setShowInspect(false);
    };

    // ── Message actions (long-press) ──
    const explain = (reason: 'schema' | 'denied' | 'expired' | 'error', what: string) =>
        alert(
            reason === 'schema'
                ? `${what} needs a one-time database update. Ask the admin to run supabase/skfl_schema.sql.`
                : reason === 'expired'
                    ? 'You can only edit a message within 10 minutes of sending it.'
                    : reason === 'denied'
                        ? `You are not allowed to ${what.toLowerCase()} this message.`
                        : `Could not ${what.toLowerCase()} the message. Check your connection and try again.`
        );

    // "This message was deleted" rows can be selected too (to delete them for yourself); only unsent ones cannot
    const canSelect = (m: SkflMessage) => !m.id.startsWith('opt_');

    const onLongPressMsg = (m: SkflMessage) => {
        if (!canSelect(m)) return;
        hap();
        Keyboard.dismiss();
        setShowThreeDots(false);
        toggleSelected(m);
    };

    // While something is selected, tapping a message adds it to (or removes it from) the selection
    const onPressMsg = (m: SkflMessage) => {
        if (!selectionActive) return;
        if (!selectedIdSet.has(m.id) && !canSelect(m)) return;
        hap();
        toggleSelected(m);
        setShowThreeDots(false);
    };

    const onReplyMsg = (m: SkflMessage) => {
        if (m.deleted_at) return;
        clearSelection();
        setShowThreeDots(false);
        setEditing(null);
        setReplyingTo(m);
    };

    const deleteForMe = (list: SkflMessage[]) => {
        clearSelection();
        setShowThreeDots(false);
        setShowDeleteModal(false);
        setHiddenIds((prev) => {
            const next = new Set(prev);
            list.forEach((m) => next.add(m.id));
            saveHiddenIds(next);
            return next;
        });
        showToast(list.length > 1 ? `${list.length} messages deleted for you` : 'Deleted for you');
    };

    const deleteForEveryone = async (list: SkflMessage[]) => {
        clearSelection();
        setShowThreeDots(false);
        setShowDeleteModal(false);
        // Show them gone instantly, roll back the ones the server refuses
        const ids = new Set(list.map((m) => m.id));
        const deletedAt = new Date().toISOString();
        setMessages((p) => p.map((x) => (ids.has(x.id)
            ? { ...x, deleted_at: deletedAt, content: null, media_public_url: null, media_storage_path: null }
            : x)));
        const results = await Promise.all(list.map(async (m) => ({ m, res: await deleteMessageForEveryone(m) })));
        const failed = results.filter((r) => !r.res.ok);
        if (failed.length > 0) {
            const original = new Map(failed.map((f) => [f.m.id, f.m]));
            setMessages((p) => p.map((x) => original.get(x.id) ?? x));
            const first = failed[0].res;
            if (!first.ok) explain(first.reason, 'Delete');
        }
    };

    const startEdit = (m: SkflMessage) => {
        clearSelection();
        setShowThreeDots(false);
        setReplyingTo(null);
        setStagedMedia(null);
        setEditing({ id: m.id, text: m.content || '' });
        setTimeout(() => {
            scrollToMsg(m.id);
        }, 150);
    };

    const handleCopy = async () => {
        if (!selectionActive) return;
        hap();
        setShowThreeDots(false);
        // oldest first, one per line; polls / events / replies as their readable summary, never raw JSON
        const textToCopy = selectedMsgs
            .map((m) => previewText(m.content).trim() || m.media_original_name || '')
            .filter(Boolean)
            .join('\n');
        if (textToCopy) {
            try {
                await Clipboard.setStringAsync(textToCopy);
                showToast(selectedMsgs.length > 1 ? `${selectedMsgs.length} messages copied` : 'Message copied');
            } catch (e) {
                console.warn('Copy error:', e);
            }
        }
        clearSelection();
    };

    const handleTogglePin = async () => {
        if (!selectedMsg) return;
        hap();
        setShowThreeDots(false);
        const id = selectedMsg.id;
        setPinnedIds((prev) => {
            const next = new Set(prev);
            const wasPinned = next.has(id);
            if (wasPinned) {
                next.delete(id);
                showToast('Message unpinned');
            } else {
                next.add(id);
                showToast('Message pinned');
            }
            AsyncStorage.setItem('skfl_pinned_ids', JSON.stringify([...next])).catch(() => { });
            return next;
        });
        clearSelection();
    };

    const canEditSelected = useMemo(() => {
        if (!selectedMsg || !identity) return false;
        return (
            isOwnMessage(selectedMsg, identity.clientId, myClientIds, mySentIds) &&
            selectedMsg.message_type === 'text' &&
            !selectedMsg.deleted_at &&
            !parseRich(selectedMsg.content) &&
            withinEditWindow(selectedMsg) // 10 minutes after sending, then the message is final
        );
        // showThreeDots: re-check when the menu opens, so a message that has just passed 10 minutes loses "Edit"
    }, [selectedMsg, identity, myClientIds, mySentIds, showThreeDots]);

    // Deleted messages have nothing to copy, pin or show info for — only "delete for me"
    const hasLiveSelected = selectedMsgs.some((m) => !m.deleted_at);

    // "Delete for everyone" is offered only when every selected message is your own
    const canDeleteForEveryone = useMemo(
        () => !!identity && selectedMsgs.length > 0 && selectedMsgs.every((m) => isOwnMessage(m, identity.clientId, myClientIds, mySentIds) && !m.deleted_at),
        [selectedMsgs, identity, myClientIds, mySentIds]
    );

    // The phone's back button leaves selection mode first
    useEffect(() => {
        if (!selectionActive) return;
        const h = BackHandler.addEventListener('hardwareBackPress', () => {
            setSelectedIds([]);
            setShowThreeDots(false);
            return true;
        });
        return () => h.remove();
    }, [selectionActive]);

    const handleSend = async (typedText: string) => {
        if (editing) {
            saveEdit(typedText);
            return;
        }

        const currentReply = replyingTo;
        const currentStaged = stagedMedia;

        setReplyingTo(null);
        setStagedMedia(null);

        let finalContent: string | null = typedText.trim() || null;
        if (currentReply) {
            const snippet = getMessageSnippet(currentReply);
            finalContent = encodeRich({
                kind: 'reply',
                replyTo: {
                    id: currentReply.id,
                    sender_badge: currentReply.sender_badge,
                    sender_client_id: currentReply.sender_client_id,
                    sender_avatar_color: currentReply.sender_avatar_color,
                    text: snippet.text,
                    message_type: currentReply.message_type,
                    media_url: snippet.media_url,
                },
                text: typedText.trim(),
            });
        }

        if (currentStaged) {
            await sendMedia(
                currentStaged.uri,
                currentStaged.fileName,
                currentStaged.mimeType,
                currentStaged.type,
                currentStaged.extras,
                finalContent
            );
        } else if (typedText.trim() || currentReply) {
            await sendText(finalContent || typedText.trim());
        }
    };

    const saveEdit = async (text: string) => {
        const target = messagesRef.current.find((x) => x.id === editing?.id);
        setEditing(null);
        if (!target || text.trim() === (target.content || '').trim()) return;
        if (!withinEditWindow(target)) {
            // the 10 minutes ran out while the edit box was open
            explain('expired', 'Edit');
            return;
        }
        const editedAt = new Date().toISOString();
        setMessages((p) => p.map((x) => (x.id === target.id ? { ...x, content: text, edited_at: editedAt } : x)));
        const res = await editMessage(target, text);
        if (!res.ok) {
            setMessages((p) => p.map((x) => (x.id === target.id ? target : x)));
            explain(res.reason, 'Edit');
        }
    };

    // Enforce restriction: strictly filter out any automated system or test bot messages
    const humanMessages = useMemo(
        () =>
            messages.filter(
                (m) =>
                    !hiddenIds.has(m.id) &&
                    m.sender_badge !== 'System' &&
                    m.sender_badge !== 'System Bot' &&
                    !m.content?.toLowerCase().includes('system test')
            ),
        [messages, hiddenIds]
    );

    const [activePinnedIndex, setActivePinnedIndex] = useState(0);

    const pinnedMsgs = useMemo(() => {
        if (pinnedIds.size === 0) return [];
        return humanMessages.filter((m) => pinnedIds.has(m.id));
    }, [pinnedIds, humanMessages]);

    const currentPinnedMsg = pinnedMsgs.length > 0
        ? pinnedMsgs[activePinnedIndex % pinnedMsgs.length]
        : null;

    const renderPinnedContent = useCallback((m: SkflMessage) => {
        const isImage = m.message_type === 'image';
        const isVideo = m.message_type === 'video';
        const isAudio = m.message_type === 'audio';
        const isFile = m.message_type === 'file';
        const rich = parseRich(m.content);

        if (isImage) {
            return (
                <View style={styles.pinnedRowContent}>
                    <PhotoOutlineIcon size={15} color="#8696A0" />
                    <Text style={styles.pinnedBarText} numberOfLines={1}>
                        Photo{m.content && m.content !== m.media_file_name ? `  ${m.content}` : ''}
                    </Text>
                </View>
            );
        }
        if (isVideo) {
            return (
                <View style={styles.pinnedRowContent}>
                    <VideoOutlineIcon size={15} color="#8696A0" />
                    <Text style={styles.pinnedBarText} numberOfLines={1}>
                        Video{m.content && m.content !== m.media_file_name ? `  ${m.content}` : ''}
                    </Text>
                </View>
            );
        }
        if (isAudio) {
            return (
                <View style={styles.pinnedRowContent}>
                    <AudioOutlineIcon size={15} color="#8696A0" />
                    <Text style={styles.pinnedBarText} numberOfLines={1}>
                        {m.media_original_name && !m.media_original_name.startsWith('voice_')
                            ? m.media_original_name
                            : 'Voice message'}
                    </Text>
                </View>
            );
        }
        if (isFile) {
            return (
                <View style={styles.pinnedRowContent}>
                    <FileOutlineIcon size={15} color="#8696A0" />
                    <Text style={styles.pinnedBarText} numberOfLines={1}>
                        {m.media_original_name || m.media_file_name || 'Document'}
                    </Text>
                </View>
            );
        }
        if (rich?.kind === 'poll') {
            return (
                <View style={styles.pinnedRowContent}>
                    <Text style={{ fontSize: 13, marginRight: 6 }}>📊</Text>
                    <Text style={styles.pinnedBarText} numberOfLines={1}>
                        Poll: {rich.question}
                    </Text>
                </View>
            );
        }
        return (
            <Text style={styles.pinnedBarText} numberOfLines={1}>
                {previewText(m.content) || 'Pinned message'}
            </Text>
        );
    }, []);

    // Messages + day separators ("Today", "Yesterday", "24 September 2026"), with each message
    // flagged as first / last of a consecutive run from the same sender.
    const listItems = useMemo<ChatListItem[]>(() => {
        const items: ChatListItem[] = [];
        const now = new Date();
        let lastDay = '';
        humanMessages.forEach((m, idx) => {
            const day = dayKey(m.created_at);
            const newDay = day !== lastDay;
            if (newDay) {
                lastDay = day;
                items.push({ kind: 'date', key: `date_${day}`, label: dayLabel(m.created_at, now) });
            }
            const prev = humanMessages[idx - 1];
            const next = humanMessages[idx + 1];
            const mSelf = isOwnMessage(m, identity?.clientId, myClientIds, mySentIds);
            const prevSelf = prev ? isOwnMessage(prev, identity?.clientId, myClientIds, mySentIds) : null;
            const nextSelf = next ? isOwnMessage(next, identity?.clientId, myClientIds, mySentIds) : null;
            const first = newDay || !prev || prevSelf !== mSelf || prev.sender_client_id !== m.sender_client_id;
            const last = !next || dayKey(next.created_at) !== day || nextSelf !== mSelf || next.sender_client_id !== m.sender_client_id;
            items.push({ kind: 'msg', key: m.id, msg: m, first, last });
        });
        return items;
    }, [humanMessages, identity?.clientId, myClientIds, mySentIds]);

    const scrollToMsg = (id: string) => {
        const idx = listItems.findIndex((i) => i.kind === 'msg' && i.msg.id === id);
        if (idx >= 0) {
            try {
                listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
            } catch (e) {
                listRef.current?.scrollToOffset({ offset: Math.max(0, idx * 70), animated: true });
            }
        }
    };

    // Row handlers keep the same identity forever (they call the latest version), so memoised message rows
    // are not redrawn every time something unrelated changes in this screen.
    const rowHandlers = useRef<any>({});
    rowHandlers.current = { openMedia, onLongPressMsg, onPressMsg, onReplyMsg, scrollToMsg, onVote, onDownloadMedia, onOpenFile };
    const stableRow = useMemo(
        () => ({
            onMedia: (...a: any[]) => rowHandlers.current.openMedia(...a),
            onLongPress: (...a: any[]) => rowHandlers.current.onLongPressMsg(...a),
            onPress: (...a: any[]) => rowHandlers.current.onPressMsg(...a),
            onReply: (...a: any[]) => rowHandlers.current.onReplyMsg(...a),
            onPressQuote: (...a: any[]) => rowHandlers.current.scrollToMsg(...a),
            onVote: (...a: any[]) => rowHandlers.current.onVote(...a),
            senderOf: (id: string) => messagesRef.current.find((x) => x.id === id)?.sender_client_id,
            onDownload: (...a: any[]) => rowHandlers.current.onDownloadMedia(...a),
            onOpenFile: (...a: any[]) => rowHandlers.current.onOpenFile(...a),
        }),
        []
    );

    const renderChatItem = useCallback(
        ({ item }: { item: ChatListItem }) => {
            if (item.kind === 'date') return <DayChip label={item.label} theme={theme} />;
            const m = item.msg;
            // "Mine" = sent from THIS device. Uses multi-layer client ID, historical client IDs, and local sent cache.
            const isSelf = isOwnMessage(m, identity?.clientId, myClientIds, mySentIds);
            return (
                <MessageBubble
                    msg={m}
                    isSelf={isSelf}
                    animateIn={Date.now() - (freshRef.current.get(m.id) ?? 0) < 2000}
                    isFirstInRun={item.first}
                    isLastInRun={item.last}
                    theme={theme}
                    onMedia={stableRow.onMedia}
                    onLongPress={stableRow.onLongPress}
                    onPress={stableRow.onPress}
                    isSelected={selectedIdSet.has(m.id)}
                    isPinned={pinnedIds.has(m.id)}
                    onReply={stableRow.onReply}
                    onPressQuote={stableRow.onPressQuote}
                    senderOf={stableRow.senderOf}
                    myId={identity?.clientId}
                    responses={responsesOf(m)}
                    onVote={stableRow.onVote}
                    onDownload={stableRow.onDownload}
                    onOpenFile={stableRow.onOpenFile}
                />
            );
        },
        [theme, identity, myClientIds, mySentIds, selectedIdSet, pinnedIds, stableRow]
    );

    // ── MAIN CHAT UI ──
    return (
        <View style={[styles.mainScreenWrap, { backgroundColor: theme.bg }]}>
            {/* Translucent so the header's own background runs up under the status bar / camera cut-out
          (the header pads itself by the real top inset) */}
            <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent
            />
            {/* Bottom padding = measured keyboard overlap, so the message bar always sits on top of the keyboard */}
            <Animated.View
                onLayout={(e) => {
                    rootHeightRef.current = e.nativeEvent.layout.height;
                    if (kbTopRef.current != null) updateKbLift(0); // window resized under an open keyboard
                }}
                style={[styles.flex, { backgroundColor: theme.bg, paddingBottom: kbLift }]}
            >
                {/* Elevated, High-Engaging Header with Safe Notch / Status Bar Inset */}
                <Header
                    theme={theme}
                    topInset={topInset}
                    selectedCount={selectedMsgs.length}
                    onClearSelection={() => {
                        clearSelection();
                        setShowThreeDots(false);
                    }}
                    onDeleteSelected={() => {
                        setShowThreeDots(false);
                        setShowDeleteModal(true);
                    }}
                    onOpenThreeDots={() => {
                        setShowThreeDots(prev => !prev);
                    }}
                    showMore={hasLiveSelected}
                    isEditing={!!editing}
                    onCancelEdit={() => setEditing(null)}
                />

                {/* WhatsApp-Style Pinned Message Bar */}
                {currentPinnedMsg && !editing && (
                    <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() => {
                            if (pinnedMsgs.length === 0) return;
                            hap();
                            const target = pinnedMsgs[activePinnedIndex % pinnedMsgs.length];
                            if (target) {
                                scrollToMsg(target.id);
                                // WhatsApp style: highlight the message and auto-clear after 1.8s
                                setSelectedIds([target.id]);
                                setTimeout(() => {
                                    setSelectedIds((prev) => (prev.length === 1 && prev[0] === target.id ? [] : prev));
                                }, 1800);
                            }
                            setActivePinnedIndex((prev) => (prev + 1) % pinnedMsgs.length);
                        }}
                        style={styles.pinnedBar}
                    >
                        {/* Left segment strip — one slot per pinned message, active one lit in green */}
                        <View style={styles.pinnedSegmentCol}>
                            {pinnedMsgs.map((pm, idx) => (
                                <View
                                    key={pm.id}
                                    style={[
                                        styles.pinnedSegment,
                                        {
                                            flex: 1,
                                            backgroundColor:
                                                idx === (activePinnedIndex % pinnedMsgs.length)
                                                    ? '#20C65A'
                                                    : 'rgba(255, 255, 255, 0.22)',
                                        },
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Content: label row + preview row */}
                        <View style={styles.pinnedContent}>
                            <View style={styles.pinnedPreviewRow}>
                                {renderPinnedContent(currentPinnedMsg)}
                            </View>
                        </View>

                        {/* Media thumbnail (image / video only) */}
                        {currentPinnedMsg.media_public_url &&
                            (currentPinnedMsg.message_type === 'image' || currentPinnedMsg.message_type === 'video') && (
                                <Image
                                    source={{ uri: currentPinnedMsg.media_public_url }}
                                    style={styles.pinnedThumb}
                                    resizeMode="cover"
                                />
                            )}
                    </TouchableOpacity>
                )}

                {/* Message list with animated loading state, over a subtle brand wallpaper */}
                <View style={styles.chatCanvas}>
                    <ChatBackdrop isDark={true} />
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <LoadingDots />
                        </View>
                    ) : (
                        <FlatList
                            ref={listRef}
                            style={{ opacity: listReady ? 1 : 0 }}
                            // Draw the whole newest page (messages + day separators) on the first pass. With fewer, the last rows
                            // are not on screen yet when the list jumps to the end, so the chat opened above the newest message.
                            initialNumToRender={Math.min(90, Math.max(40, listItems.length))}
                            maxToRenderPerBatch={12}
                            updateCellsBatchingPeriod={40}
                            windowSize={9}
                            data={listItems}
                            keyExtractor={i => i.key}
                            onViewableItemsChanged={onViewableRef.current}
                            viewabilityConfig={viewabilityConfigRef.current}
                            contentContainerStyle={styles.listContent}
                            extraData={`${identity?.clientId || ''}_${myClientIds.size}_${mySentIds.size}_${typers.length}_${selectedIds.length}_${pinnedIds.size}`}
                            onContentSizeChange={onContentSizeChange}
                            onScroll={onListScroll}
                            onTouchStart={() => {
                                if (showThreeDots) setShowThreeDots(false);
                            }}
                            onScrollBeginDrag={() => {
                                userScrolledRef.current = true;
                                if (showThreeDots) setShowThreeDots(false);
                            }}
                            onLayout={(e) => {
                                const prevH = layoutHeightRef.current;
                                const newH = e.nativeEvent.layout.height;
                                layoutHeightRef.current = newH;
                                if (prevH > 0 && stickToBottomRef.current) {
                                    scrollBottom(newH < prevH);
                                }
                            }}
                            scrollEventThrottle={100}
                            // Page in the next 30 older messages when the user reaches the top,
                            // keeping the message they were reading in place
                            onStartReached={() => loadOlder()}
                            onStartReachedThreshold={0.4}
                            maintainVisibleContentPosition={loadingOlder ? { minIndexForVisible: 1 } : undefined}
                            ListHeaderComponent={
                                loadingOlder ? (
                                    <View style={styles.olderLoader}>
                                        <ActivityIndicator size="small" color={theme.accent} />
                                        <Text style={[styles.olderLoaderText, { color: theme.placeholder }]}>Loading earlier messages…</Text>
                                    </View>
                                ) : null
                            }
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            renderItem={renderChatItem}
                            ListFooterComponent={
                                typers.length > 0 ? (
                                    <View style={styles.typingFooterWrap}>
                                        <TypingBubble theme={theme} typers={typers} />
                                    </View>
                                ) : null
                            }
                        />
                    )}

                    {/* Loading dots stay up until the list has settled on the newest message */}
                    {!loading && !listReady && (
                        <View style={[StyleSheet.absoluteFill, styles.loadingWrap]} pointerEvents="none">
                            <LoadingDots />
                        </View>
                    )}

                    {/* Floating day chip while scrolling */}
                    {!loading && <FloatingDayChip ref={chipRef} />}

                    {/* Scroll-to-bottom, WhatsApp-style: a dark double-chevron button, with a small green count badge once something new arrived while scrolled away */}
                    <ScrollDownButton
                        visible={showScrollDown || unseenCount > 0}
                        unseenCount={unseenCount}
                        onPress={() => jumpToLatest(true)}
                    />
                </View>

                {/* Input area elevated above software keyboard and navigation bar */}
                {recording ? (
                    <VoiceRecorderPanel
                        theme={theme}
                        bottomInset={keyboardVisible ? 8 : bottomInset}
                        onSend={sendVoice}
                        onCancel={() => setRecording(false)}
                    />
                ) : (
                    <InputBar
                        theme={theme}
                        onText={handleSend}
                        editing={editing}
                        onCancelEdit={() => setEditing(null)}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        stagedMedia={stagedMedia}
                        onCancelStagedMedia={() => setStagedMedia(null)}
                        myId={identity?.clientId}
                        onAttach={() => {
                            if (showAttach) { setShowAttach(false); return; }
                            Keyboard.dismiss();
                            setShowAttach(true);
                        }}
                        onAttachClose={() => setShowAttach(false)}
                        attachPanel={showAttach ? (
                            <AttachMenu
                                theme={theme}
                                bottomInset={bottomInset}
                                onClose={() => setShowAttach(false)}
                                onDocument={pickDocument}
                                onMedia={pickGallery}
                                onAudio={pickAudio}
                                onContact={pickContact}
                                onPoll={() => setShowPoll(true)}
                                onEvent={() => setShowEvent(true)}
                            />
                        ) : null}
                        onCamera={pickCamera}
                        onVoice={() => { setShowAttach(false); setRecording(true); }}
                        onTyping={(v) => typingSessionRef.current?.setTyping(v)}
                        bottomInset={bottomInset}
                        isKeyboardOpen={keyboardVisible}
                        onFocus={() => scrollBottom(true)}
                    />
                )}

                {/* 3-Dots Dropdown Menu (Image 1) */}
                <Modal
                    visible={showThreeDots}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowThreeDots(false)}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowThreeDots(false)}>
                        <View style={[styles.threeDotsMenuWrap, { top: topInset + 48 }]}>
                            <Pressable style={[styles.threeDotsMenu, { backgroundColor: '#1E262C', borderColor: 'rgba(255,255,255,0.08)' }]}>
                                <TouchableOpacity
                                    style={styles.threeDotsItem}
                                    activeOpacity={0.7}
                                    onPress={handleCopy}
                                >
                                    <Text style={[styles.threeDotsText, { color: '#E9EDEF' }]}>Copy</Text>
                                </TouchableOpacity>

                                {selectedMsg && !selectedMsg.deleted_at && (
                                    <TouchableOpacity
                                        style={styles.threeDotsItem}
                                        activeOpacity={0.7}
                                        onPress={handleTogglePin}
                                    >
                                        <Text style={[styles.threeDotsText, { color: '#E9EDEF' }]}>
                                            {pinnedIds.has(selectedMsg.id) ? 'Unpin' : 'Pin'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {canEditSelected && (
                                    <TouchableOpacity
                                        style={styles.threeDotsItem}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            setShowThreeDots(false);
                                            if (selectedMsg) {
                                                const target = selectedMsg;
                                                startEdit(target);
                                            }
                                        }}
                                    >
                                        <Text style={[styles.threeDotsText, { color: '#E9EDEF' }]}>Edit</Text>
                                    </TouchableOpacity>
                                )}
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>

                {/* WhatsApp-Style Delete Confirmation Modal */}
                <Modal
                    visible={showDeleteModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowDeleteModal(false)}>
                        <Pressable style={[styles.deleteModalCard, { backgroundColor: '#1E262C', borderColor: 'rgba(255,255,255,0.08)' }]}>
                            <Text style={[styles.deleteModalTitle, { color: '#E9EDEF' }]}>
                                {selectedMsgs.length > 1 ? `Delete ${selectedMsgs.length} messages?` : 'Delete message?'}
                            </Text>

                            {canDeleteForEveryone && (
                                <TouchableOpacity
                                    style={styles.deleteModalOption}
                                    activeOpacity={0.7}
                                    onPress={() => deleteForEveryone(selectedMsgs)}
                                >
                                    <Text style={[styles.deleteModalOptionText, { color: '#EF4444' }]}>Delete for everyone</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.deleteModalOption}
                                activeOpacity={0.7}
                                onPress={() => deleteForMe(selectedMsgs)}
                            >
                                <Text style={[styles.deleteModalOptionText, { color: '#E9EDEF' }]}>Delete for me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.deleteModalOption, { borderBottomWidth: 0, marginTop: 4 }]}
                                activeOpacity={0.7}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={[styles.deleteModalOptionText, { color: theme.placeholder }]}>Cancel</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Subtle Toast Pill */}
                {toastText !== '' && (
                    <Animated.View style={[styles.toastPillWrap, { opacity: toastOpacity }]} pointerEvents="none">
                        <View style={[styles.toastPill, { backgroundColor: 'rgba(30, 38, 44, 0.95)' }]}>
                            <Text style={styles.toastPillText}>{toastText}</Text>
                        </View>
                    </Animated.View>
                )}
                <PollComposer visible={showPoll} theme={theme} onClose={() => setShowPoll(false)} onSubmit={sendRich} />
                <EventComposer visible={showEvent} theme={theme} onClose={() => setShowEvent(false)} onSubmit={sendRich} />
                <EmployeeActivityModal
                    visible={showInspect} theme={theme} messages={messages}
                    onClose={() => setShowInspect(false)} onClear={doClear}
                    myId={identity?.clientId}
                />
                <LightboxModal
                    visible={lbVisible} url={lbUrl} type={lbType} msg={lbMsg}
                    onClose={() => { setLbVisible(false); setLbMsg(null); }}
                />
            </Animated.View>
        </View>
    );
}

// ──────────────────── ROOT APPLICATION ────────────────────
export default function App() {
    useEffect(() => {
        SystemUI.setBackgroundColorAsync('#0A0E13').catch(() => { });
    }, []);
    return (
        <SafeAreaProvider style={{ flex: 1, backgroundColor: '#070D11' }}>
            {/* splash → Master login → chat */}
            <AuthGate>
                <ChatAppInner />
            </AuthGate>
        </SafeAreaProvider>
    );
}

// ──────────────────── STYLES ────────────────────
const styles = StyleSheet.create({
    mainScreenWrap: {
        flex: 1,
        width: '100%',
    },
    flex: {
        flex: 1,
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 1000 : undefined,
        alignSelf: 'center',
    },
    chatCanvas: { flex: 1, position: 'relative' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: 13, marginTop: 10 },

    // Message Loading State
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    loadingTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 18,
        letterSpacing: 0.5,
    },
    loadingSub: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
        maxWidth: 290,
    },
    loadingDotsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 18,
        gap: 8,
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },


    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, elevation: 8, shadowColor: '#000', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, zIndex: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, height: 56 },
    headerNavBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderRadius: 19 },
    editHeaderTitle: { fontSize: 19.5, fontWeight: '700', letterSpacing: 0.2 },
    selectionCount: { fontSize: 20, fontWeight: '700', letterSpacing: 0.2, marginLeft: 2 },
    headerRightSelection: { flexDirection: 'row', alignItems: 'center', height: 56 },
    selectionActionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', position: 'relative', marginRight: 12 },
    headerAvatarIcon: { fontSize: 22 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },

    // Upload banner
    uploadText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Message list
    olderLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 },
    olderLoaderText: { fontSize: 12 },
    listContent: { flexGrow: 1, paddingVertical: 12, justifyContent: 'flex-end' },

    // Empty state
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyGrad: { borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', maxWidth: 340 },
    emptyIcon: { fontSize: 60, marginBottom: 14 },
    emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

    // Bubble
    bubbleRow: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 10, alignItems: 'flex-end' },
    bubbleRowSelf: { justifyContent: 'flex-end' },
    bubbleRowOther: { justifyContent: 'flex-start' },
    bubble: {
        position: 'relative',
        maxWidth: '78%',
    },
    bubbleSelf: {
        borderTopLeftRadius: 17,
        borderTopRightRadius: 17,
        borderBottomLeftRadius: 17,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        borderTopLeftRadius: 17,
        borderTopRightRadius: 17,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 17,
    },
    senderName: { fontSize: 12.5, fontWeight: '800', marginBottom: 2, letterSpacing: 0.2 },
    msgText: { fontSize: 15, lineHeight: 21.5, marginVertical: 2, letterSpacing: 0.1 },
    audioName: { fontSize: 13, fontWeight: '700', marginBottom: 2, maxWidth: 230 },
    editedLabel: { fontSize: 9.5, fontStyle: 'italic', marginRight: 3.5, opacity: 0.85, flexShrink: 0 },
    deletedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
    deletedText: { fontSize: 14.5, fontStyle: 'italic', lineHeight: 21, flexShrink: 1 },
    timeSpacer: { color: 'transparent', fontSize: 15 },
    bubbleFooterFloat: { position: 'absolute', right: 8, bottom: 4, flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
    mediaTimePill: { position: 'absolute', right: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 10 },
    mediaTimeText: { color: '#fff', fontSize: 10.5, fontWeight: '600' },
    dayChipRow: { alignItems: 'center', marginTop: 14, marginBottom: 8 },
    dayChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
    dayChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    floatDate: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, alignSelf: 'flex-end' },
    msgTime: { fontSize: 10.5, flexShrink: 0 },
    tick: { fontSize: 11, marginLeft: 3 },

    // WhatsApp-style Quoted Reply box inside bubble
    quoteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        borderLeftWidth: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginBottom: 5,
        marginTop: 2,
        overflow: 'hidden',
    },
    quoteSender: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    quoteText: {
        fontSize: 12,
        lineHeight: 16,
        opacity: 0.85,
    },
    quoteThumb: {
        width: 36,
        height: 36,
        borderRadius: 4,
        marginLeft: 6,
    },

    // Staged media preview helpers
    stagedMediaIndicator: {
        width: 4,
        height: '90%',
        borderRadius: 2,
        marginRight: 10,
    },
    stagedThumbWrap: {
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    stagedThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    stagedVideoBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    stagedFileIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stagedFileExt: {
        fontSize: 11,
        fontWeight: '800',
    },
    stagedFileName: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    stagedFileSub: {
        fontSize: 11,
        marginTop: 2,
    },
    stagedCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },

    // Media
    mediaImg: { overflow: 'hidden' },
    // download tile shown instead of someone else's photo / video until it is downloaded
    uploadScrim: { ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as object), alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    dlTile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    dlCircle: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: 'rgba(11, 20, 26, 0.82)',
        borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.22)',
        alignItems: 'center', justifyContent: 'center',
    },
    dlSizePill: {
        marginTop: 10, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 12,
        backgroundColor: 'rgba(11, 20, 26, 0.78)',
        borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.14)',
    },
    dlSizeText: { color: '#E9EDEF', fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
    videoThumb: { backgroundColor: '#000', overflow: 'hidden', justifyContent: 'flex-end' },
    videoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    videoPlay: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    videoPlayIcon: { fontSize: 20, color: '#fff', marginLeft: 2 },
    videoDur: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 6 },
    fileCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginVertical: 3, minWidth: 220, maxWidth: 290 },
    fileIconBox: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    fileIconText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    fileInfo: { flex: 1, marginRight: 8 },
    fileName: { fontSize: 13.5, fontWeight: '700' },
    fileMeta: { fontSize: 11, marginTop: 2, opacity: 0.85 },
    fileProgressTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.25)', marginTop: 6, overflow: 'hidden' },
    fileProgressFill: { height: 3, borderRadius: 2, backgroundColor: '#20C65A' },
    fileDownloadBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1.2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },

    // Audio player
    audioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, minWidth: 250 },
    audioPlayWrap: { width: 40, height: 46, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
    audioWaveWrap: { flex: 1 },
    audioBars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 },
    audioBar: { width: 3, borderRadius: 2 },
    audioHead: { position: 'absolute', top: 10, width: 12, height: 12, marginLeft: -6, borderRadius: 6 },
    audioMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
    audioTime: { fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },

    // Audio record bar
    recCapsule: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 30, borderWidth: 1.2, paddingHorizontal: 7, paddingVertical: 6, minHeight: 56, elevation: 4, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 1 }, shadowRadius: 5 },
    recDiscard: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    recCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
    recDotWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    recDotHalo: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
    recDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#EF4444' },
    recTimer: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5, minWidth: 40, fontVariant: ['tabular-nums'] },
    recWave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 30, marginLeft: 12 },
    recWaveBar: { width: 3, borderRadius: 2 },

    // Input bar
    inputBarWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 4 },
    inputCapsule: {
        flex: 1,
        flexDirection: 'column',
        borderRadius: 21,
        paddingHorizontal: 2,
        paddingVertical: 0,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
    },
    inputControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    inputIcon: { alignItems: 'center', justifyContent: 'center' },
    actionCircleBox: { marginBottom: 0 },
    waCircle: {
        flex: 1,
        backgroundColor: '#00A884',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#00A884',
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    actionBox: { width: 42, height: 42 },
    actionTouch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    inputField: {
        flex: 1,
        paddingHorizontal: 6,
        paddingTop: Platform.OS === 'ios' ? 7 : 3,
        paddingBottom: Platform.OS === 'ios' ? 7 : 3,
        textAlignVertical: 'center',
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
    },

    // Edit banner merged inside inputCapsule
    editBannerMerged: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 8,
        marginHorizontal: 3,
        marginTop: 2,
        marginBottom: 2,
        overflow: 'hidden',
    },
    editBannerBar: { width: 3.5, height: '90%', borderRadius: 2, marginRight: 8 },
    editBannerTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
    editBannerText: { fontSize: 12, marginTop: 1 },
    editBannerClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    // Reply preview banner merged inside inputCapsule (WhatsApp style)
    replyBannerMerged: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 8,
        marginHorizontal: 3,
        marginTop: 2,
        marginBottom: 2,
        overflow: 'hidden',
    },
    replyBannerBar: { width: 3.5, height: '90%', borderRadius: 2, marginRight: 8 },
    replyBannerTitle: { fontSize: 12, fontWeight: '700' },
    replyBannerText: { fontSize: 12, marginTop: 1 },
    replyBannerThumb: { width: 34, height: 34, borderRadius: 6, marginRight: 6 },

    // Staged media preview merged inside inputCapsule
    stagedMediaCardMerged: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 8,
        marginHorizontal: 3,
        marginTop: 2,
        marginBottom: 2,
        overflow: 'hidden',
    },

    // Typing bubble
    typingFooterWrap: {
        paddingTop: 3,
        paddingBottom: 8,
    },
    typingRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, marginVertical: 3, alignSelf: 'flex-start', maxWidth: '85%' },
    typingWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 17, borderBottomLeftRadius: 4, borderWidth: 1, flexShrink: 1 },
    typingDotsRow: { flexDirection: 'row', alignItems: 'center', height: 14, paddingTop: 6 },
    typingDot: { width: 7, height: 7, borderRadius: 3.5, marginHorizontal: 2.5 },
    typingLabel: { fontSize: 12, fontStyle: 'italic', marginLeft: 8, flexShrink: 1 },

    // "N new messages" pill
    // Scroll-to-bottom button, WhatsApp-style: a dark grey disc with a double chevron, and a small green
    // count badge that overlaps its top-right corner once something new has arrived.
    scrollDownBtnWrap: { position: 'absolute', right: 14, bottom: 12, width: 42, height: 42 },
    scrollDownBtn: {
        width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(35, 42, 50, 0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        elevation: 6, shadowColor: '#000', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
    },
    scrollDownBadge: {
        position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11,
        paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#20C65A', borderWidth: 2, borderColor: '#0A0E13',
    },
    scrollDownBadgeText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },

    // Attachment sheet
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80 },
    sheetCard: { width: '94%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 18, elevation: 10 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    sheetTitle: { fontSize: 16, fontWeight: '700' },
    sheetSub: { fontSize: 12, marginBottom: 16 },
    sheetGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
    sheetItem: { width: '31%', alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
    sheetIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 3 },
    sheetItemLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    sheetItemSub: { fontSize: 11 },

    // Lightbox
    lbOverlay: { flex: 1, backgroundColor: '#000' },
    lbTopBar: { height: 60, backgroundColor: 'rgba(0,0,0,0.75)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
    lbTopBtn: { padding: 8 },
    lbTopBtnText: { color: '#fff', fontSize: 20 },
    lbFileName: { color: '#fff', fontSize: 14, fontWeight: '600' },
    lbFileMeta: { color: '#8696A0', fontSize: 11, marginTop: 1 },
    lbContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lbImage: { width: SW, height: SH - 120 },
    lbVideoCard: { alignItems: 'center', padding: 24 },
    lbVideoName: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    lbFileCard: { backgroundColor: '#1F2C34', borderRadius: 16, padding: 24, alignItems: 'center', width: '85%', maxWidth: 380, borderWidth: 1, borderColor: '#2A3942' },
    lbFileIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    lbFileName2: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
    lbFileMeta2: { color: '#8696A0', fontSize: 13, marginBottom: 20 },
    lbOpenBtn: { backgroundColor: '#00A884', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    lbStatus: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,38,44,0.95)', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22, maxWidth: '90%' },
    lbStatusText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
    lbOpenBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Supabase Inspector
    inspOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 14 },
    inspCard: { width: '100%', maxWidth: 640, maxHeight: '90%', borderRadius: 18, borderWidth: 1, overflow: 'hidden', elevation: 10, flexDirection: 'column' },
    inspHeader: { padding: 18, paddingBottom: 14 },
    inspTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    inspSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
    inspClose: { position: 'absolute', top: 14, right: 14 },
    // Employee Message Activity Modal
    empStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    empStatChip: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
    empStatNum: { fontSize: 18, fontWeight: '800' },
    empStatTxt: { fontSize: 10, fontWeight: '600', color: '#8696A0', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    empFilterBox: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
    empSearchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 9 : 6, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
    empSearchInput: { flex: 1, fontSize: 13, padding: 0 },
    empPillsRow: { flexDirection: 'row', gap: 8 },
    empPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'transparent' },
    empPillActive: { backgroundColor: 'rgba(32, 198, 90, 0.18)', borderColor: '#2FD06B' },
    empPillTxt: { fontSize: 11.5, fontWeight: '600', color: '#8696A0' },
    empPillTxtActive: { color: '#6EE7A0', fontWeight: '700' },
    empListScroll: { flex: 1 },
    empEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44 },
    empEmptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    empEmptySub: { fontSize: 12 },
    empCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
    empCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    empAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    empAvatarTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
    empStaffName: { fontSize: 13, fontWeight: '700', marginRight: 6 },
    empBadgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    empBadgeTxt: { fontSize: 10, fontWeight: '700' },
    empTimeTxt: { fontSize: 10.5, marginTop: 2 },
    empDeliveredBadge: { backgroundColor: 'rgba(37, 211, 102, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    empDeliveredTxt: { color: '#25D366', fontSize: 10, fontWeight: '700' },
    empCardContent: { fontSize: 13, lineHeight: 18 },
    empMediaRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8 },
    empMediaTitle: { fontSize: 12.5, fontWeight: '600' },
    empMediaSub: { fontSize: 10.5, marginTop: 2 },
    empFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
    empActionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    empActionBtnTxt: { fontSize: 12, fontWeight: '700' },

    // 3-Dots dropdown menu (Image 1)
    threeDotsMenuWrap: { position: 'absolute', right: 14, zIndex: 999 },
    threeDotsMenu: {
        minWidth: 175,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 6,
        elevation: 16,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
    },
    threeDotsItem: { paddingHorizontal: 18, paddingVertical: 13 },
    threeDotsText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },

    // Green send button in the message bar
    sendCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#20C65A',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#20C65A',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },

    // Edit Check Button in InputBar (Image 3)
    editCheckBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#20C65A', // WhatsApp green from Image 3
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#20C65A',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },

    // Modal backdrop
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },

    // WhatsApp-Style Delete modal
    deleteModalCard: { width: '100%', maxWidth: 320, borderRadius: 18, borderWidth: 1, padding: 20, elevation: 16, shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10 },
    deleteModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    deleteModalOption: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    deleteModalOptionText: { fontSize: 15.5, fontWeight: '600' },

    // WhatsApp-Style Pinned message bar
    pinnedBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#101920',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.07)',
        minHeight: 52,
        zIndex: 8,
    },
    pinnedSegmentCol: {
        width: 3,
        height: 34,
        borderRadius: 2,
        justifyContent: 'space-between',
        gap: 2,
        marginRight: 10,
        overflow: 'hidden',
    },
    pinnedSegment: {
        width: 3,
        borderRadius: 1.5,
        marginBottom: 2,
    },
    // legacy — kept for renderPinnedContent compat
    pinnedIconWrap: {
        display: 'none' as any,
    },
    pinnedContent: {
        flex: 1,
        justifyContent: 'center',
    },
    pinnedPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pinnedRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    pinnedBarText: {
        color: '#A0ADB5',
        fontSize: 13,
        fontWeight: '400',
        flex: 1,
    },
    pinnedThumb: {
        width: 36,
        height: 36,
        borderRadius: 6,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    // Subtle Toast Notification Pill
    toastPillWrap: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', zIndex: 999 },
    toastPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, elevation: 8, shadowColor: '#000', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6 },
    toastPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
