import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import {
  DocumentIcon,
  GalleryIcon,
  AudioFileIcon,
  ContactIcon,
  PollIcon,
  CalendarIcon,
  SmileyIcon,
  ClockIcon,
  BackspaceIcon,
  CloseIcon,
  Trash2,
  WaSendIcon,
  WaMicIcon,
} from './Icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RichPayload } from '../services/chat';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { safeAudio } from '../services/media';
import { formatDuration } from '../utils';


// ════════════════════════════════════════════════════════════════════════════
// AttachMenu.tsx
// ════════════════════════════════════════════════════════════════════════════

export interface AttachTheme {
  card: string;
  border: string;
  headerText: string;
  placeholder: string;
  accent: string;
}

interface Props {
  theme: AttachTheme;
  /** safe-area inset at the bottom of the screen, so the panel clears the gesture bar */
  bottomInset: number;
  onClose: () => void;
  onDocument: () => void;
  onMedia: () => void;
  onAudio: () => void;
  onContact: () => void;
  onPoll: () => void;
  onEvent: () => void;
}

const COLUMNS = 3;

/**
 * WhatsApp-style attachment panel. It is docked right under the message bar (where the keyboard was),
 * so the bar stays visible above it. A grid of round-cornered icon buttons; they pop in one after another.
 * The camera is not here — the message bar already has its own camera button.
 */
export function AttachMenu({
  theme, bottomInset, onClose,
  onDocument, onMedia, onAudio, onContact, onPoll, onEvent,
}: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  const items = [
    { key: 'media', label: 'Gallery', icon: <GalleryIcon size={26} color="#0795DC" />, run: onMedia },
    { key: 'doc', label: 'Document', icon: <DocumentIcon size={26} color="#7F66FF" />, run: onDocument },
    { key: 'audio', label: 'Audio', icon: <AudioFileIcon size={26} />, run: onAudio },
    { key: 'contact', label: 'Contact', icon: <ContactIcon size={26} />, run: onContact },
    { key: 'poll', label: 'Poll', icon: <PollIcon size={26} />, run: onPoll },
    { key: 'event', label: 'Event', icon: <CalendarIcon size={26} />, run: onEvent },
  ];

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const pick = (fn: () => void) => () => {
    onClose();
    // let the panel go away before a system picker / another dialog opens
    setTimeout(fn, 60);
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          paddingBottom: Math.max(bottomInset, 12) + 6,
          opacity: enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
        },
      ]}
    >
      <View style={[styles.handle, { backgroundColor: theme.placeholder + '66' }]} />

      <View style={styles.grid}>
        {items.map((it, i) => {
          // each icon starts a little later than the one before it
          const start = 0.15 + i * 0.08;
          const pop = enter.interpolate({ inputRange: [start, Math.min(1, start + 0.45)], outputRange: [0, 1], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={it.key}
              style={[
                styles.cell,
                {
                  opacity: pop,
                  transform: [
                    { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                    { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                  ],
                },
              ]}
            >
              <Pressable onPress={pick(it.run)} accessibilityRole="button" accessibilityLabel={it.label} style={styles.cellPress}>
                {({ pressed }) => (
                  <>
                    <View
                      style={[
                        styles.pill,
                        {
                          borderColor: pressed ? theme.accent : theme.border,
                          backgroundColor: pressed ? theme.accent + '22' : 'rgba(255,255,255,0.04)',
                          transform: [{ scale: pressed ? 0.93 : 1 }],
                        },
                      ]}
                    >
                      {it.icon}
                    </View>
                    <Text style={[styles.label, { color: theme.placeholder }]} numberOfLines={1}>{it.label}</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / COLUMNS}%`, paddingHorizontal: 6, marginBottom: 16 },
  cellPress: { alignItems: 'center' },
  pill: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: 8, fontSize: 13, fontWeight: '500' },
});

// ════════════════════════════════════════════════════════════════════════════
// EmojiPicker.tsx
// ════════════════════════════════════════════════════════════════════════════

export interface EmojiTheme {
  card: string;
  border: string;
  placeholder: string;
  headerText: string;
  bg: string;
}

const RECENTS_KEY = '@skfl_recent_emojis';
const MAX_RECENTS = 24;
const GREEN = '#20C65A';

const GROUPS: { key: string; tab: string; title: string; items: string[] }[] = [
  {
    key: 'smileys', tab: '😀', title: 'Smileys',
    items: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
      '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣',
      '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😎', '🤓', '😕', '🙃', '🤑', '😲', '🙁',
      '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶',
      '😳', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥳', '🥺', '😈', '💀', '🤡',
    ],
  },
  {
    key: 'gestures', tab: '👍', title: 'Gestures',
    items: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️',
      '🖖', '👋', '🤝', '🙏', '💪', '👏', '🙌', '👐', '🤲', '✍️', '🫡', '🫶', '🤌', '👀', '🧠', '🫵',
    ],
  },
  {
    key: 'hearts', tab: '❤️', title: 'Hearts & symbols',
    items: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '✨', '🔥', '⭐', '🌟', '💯', '✅', '❌', '⚠️', '❓', '❗', '💤', '🎉', '🎊', '🎁', '🏆', '🎯',
    ],
  },
  {
    key: 'food', tab: '🍔', title: 'Food & nature',
    items: [
      '🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍅', '🥕', '🌽', '🥔', '🍞',
      '🧀', '🍔', '🍕', '🌭', '🌮', '🍟', '🍗', '🍚', '🍜', '🍝', '🍰', '🍩', '🍪', '☕', '🍵', '🥤',
      '🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐯', '🦁', '🐮', '🐸', '🐵', '🌳', '🌴', '🌻', '🌈',
    ],
  },
  {
    key: 'work', tab: '🛠️', title: 'Work & places',
    items: [
      '📌', '📎', '📅', '🕒', '📞', '📱', '💻', '🖥️', '📷', '🎥', '🔧', '🛠️', '⚙️', '🏗️', '⛏️', '🚜',
      '🚛', '🚧', '🦺', '👷', '📦', '📈', '📉', '📝', '📁', '🔒', '🔑', '🏠', '🚗', '✈️', '⛑️', '🔩',
    ],
  },
];

interface Props_EmojiPicker {
  /** total height of the panel (matches the keyboard it replaces) */
  height: number;
  theme: EmojiTheme;
  /** space for the phone's navigation bar / home indicator below the panel */
  bottomInset: number;
  onPick: (emoji: string) => void;
  onBackspace: () => void;
}

/**
 * Emoji panel that takes the keyboard's place, like WhatsApp: header with a backspace key,
 * a scrolling grid, and a category bar at the bottom. Recently used emojis come first.
 */
export function EmojiPanel({ height, theme, bottomInset, onPick, onBackspace }: Props_EmojiPicker) {
  const [recents, setRecents] = useState<string[]>([]);
  const [tab, setTab] = useState<string>('smileys');
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const repeat = useRef<any>(null);
  const holdTimer = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY)
      .then((raw) => {
        if (raw) {
          const list: string[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            setRecents(list);
            if (list.length) setTab('recents');
          }
        }
      })
      .catch(() => {});
    return () => {
      clearTimeout(holdTimer.current);
      clearInterval(repeat.current);
    };
  }, []);

  const pick = (em: string) => {
    onPick(em);
    setRecents((prev) => {
      const next = [em, ...prev.filter((x) => x !== em)].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // Holding backspace keeps deleting, like a keyboard key
  const startDelete = () => {
    onBackspace();
    holdTimer.current = setTimeout(() => {
      repeat.current = setInterval(onBackspace, 55);
    }, 380);
  };
  const stopDelete = () => {
    clearTimeout(holdTimer.current);
    clearInterval(repeat.current);
  };

  const groups = recents.length ? [{ key: 'recents', tab: '', title: 'Recents', items: recents }, ...GROUPS] : GROUPS;
  const muted = '#AEBAC1';

  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y + 24;
    let current = groups[0].key;
    for (const g of groups) if ((offsets.current[g.key] ?? 0) <= y) current = g.key;
    setTab(current);
  };

  return (
    <View style={[styles_EmojiPicker.panel, { height, backgroundColor: theme.card, borderTopColor: theme.border }]}>
      {/* Header: label pill + backspace */}
      <View style={styles_EmojiPicker.header}>
        <View style={[styles_EmojiPicker.pill, { backgroundColor: theme.border }]}>
          <SmileyIcon size={20} color={theme.headerText} />
          <Text style={[styles_EmojiPicker.pillText, { color: theme.headerText }]}>Emoji</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          onPressIn={startDelete}
          onPressOut={stopDelete}
          style={({ pressed }) => [styles_EmojiPicker.backspace, pressed && { backgroundColor: theme.border }]}
          accessibilityLabel="Delete"
        >
          <BackspaceIcon size={24} color={muted} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={64}
      >
        {groups.map((g) => (
          <View key={g.key} onLayout={(e) => { offsets.current[g.key] = e.nativeEvent.layout.y; }}>
            <Text style={[styles_EmojiPicker.groupTitle, { color: theme.placeholder }]}>{g.title}</Text>
            <View style={styles_EmojiPicker.grid}>
              {g.items.map((em, i) => (
                <Pressable
                  key={`${g.key}${i}`}
                  onPress={() => pick(em)}
                  style={({ pressed }) => [styles_EmojiPicker.cell, pressed && { backgroundColor: 'rgba(32,198,90,0.22)' }]}
                >
                  <Text style={styles_EmojiPicker.emoji}>{em}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Category bar */}
      <View style={[styles_EmojiPicker.cats, { borderTopColor: theme.border, paddingBottom: bottomInset }]}>
        {groups.map((g) => {
          const on = tab === g.key;
          return (
            <Pressable
              key={g.key}
              onPress={() => {
                setTab(g.key);
                scroller.current?.scrollTo({ y: offsets.current[g.key] || 0, animated: true });
              }}
              style={[styles_EmojiPicker.cat, on && { backgroundColor: theme.border }]}
              accessibilityLabel={g.title}
            >
              {g.key === 'recents' ? (
                <ClockIcon size={20} color={on ? GREEN : muted} />
              ) : (
                <Text style={[styles_EmojiPicker.catEmoji, { opacity: on ? 1 : 0.6 }]}>{g.tab}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles_EmojiPicker = StyleSheet.create({
  panel: { borderTopWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  pillText: { fontSize: 13, fontWeight: '700' },
  backspace: { width: 44, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 12, fontWeight: '800', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  emoji: { fontSize: 26 },
  cats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, paddingTop: 6, paddingHorizontal: 6 },
  cat: { width: 44, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 19 },
});

// ════════════════════════════════════════════════════════════════════════════
// Composers.tsx
// ════════════════════════════════════════════════════════════════════════════

// WhatsApp green for polls, events and their buttons (replaces the yellow accent)
const GREEN_Composers = '#20C65A';
const GREEN_TEXT = '#22B95B';


export interface ComposerTheme {
  card: string;
  border: string;
  headerText: string;
  placeholder: string;
  inputBg: string;
  inputText: string;
  accent: string;
  accentGold: string;
  danger: string;
}

// The native date/time picker does not exist on web, so only load it on phones
const DateTimeModule: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Shell({
  visible, title, icon, theme, onClose, canSubmit, submitLabel, onSubmit, children,
}: {
  visible: boolean; title: string; icon: React.ReactNode; theme: ComposerTheme; onClose: () => void;
  canSubmit: boolean; submitLabel: string; onSubmit: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles_Composers.backdrop} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles_Composers.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles_Composers.head}>
            <View style={[styles_Composers.headIcon, { backgroundColor: GREEN_Composers + '22' }]}>{icon}</View>
            <Text style={[styles_Composers.headTitle, { color: theme.headerText }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles_Composers.headClose} hitSlop={10} accessibilityLabel="Close">
              <CloseIcon size={18} color={theme.placeholder} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {children}
          </ScrollView>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles_Composers.submit,
              { backgroundColor: GREEN_Composers, opacity: !canSubmit ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles_Composers.submitText}>{submitLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder, theme, multiline, maxLength,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; theme: ComposerTheme;
  multiline?: boolean; maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles_Composers.label, { color: theme.placeholder }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          styles_Composers.input,
          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.inputText },
          multiline && { minHeight: 70, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

// ─────────────────────────────── POLL ───────────────────────────────

export function PollComposer({
  visible, theme, onClose, onSubmit,
}: { visible: boolean; theme: ComposerTheme; onClose: () => void; onSubmit: (p: RichPayload) => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [multi, setMulti] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuestion('');
      setOptions(['', '']);
      setMulti(false);
    }
  }, [visible]);

  const cleaned = options.map((o) => o.trim()).filter(Boolean);
  const unique = new Set(cleaned.map((o) => o.toLowerCase())).size === cleaned.length;
  const canSubmit = question.trim().length > 0 && cleaned.length >= 2 && unique;

  return (
    <Shell
      visible={visible}
      title="Create poll"
      icon={<PollIcon size={20} color={GREEN_Composers} />}
      theme={theme}
      onClose={onClose}
      canSubmit={canSubmit}
      submitLabel="Send poll"
      onSubmit={() => onSubmit({ kind: 'poll', question: question.trim(), options: cleaned, multi })}
    >
      <Field label="QUESTION" value={question} onChangeText={setQuestion} placeholder="Ask a question" theme={theme} maxLength={140} />

      <Text style={[styles_Composers.label, { color: theme.placeholder }]}>OPTIONS</Text>
      {options.map((o, i) => (
        <View key={i} style={styles_Composers.optionRow}>
          <TextInput
            value={o}
            onChangeText={(t) => setOptions((prev) => prev.map((x, j) => (j === i ? t : x)))}
            placeholder={`Option ${i + 1}`}
            placeholderTextColor={theme.placeholder}
            maxLength={80}
            style={[styles_Composers.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.inputText }]}
          />
          {options.length > 2 && (
            <Pressable onPress={() => setOptions((prev) => prev.filter((_, j) => j !== i))} style={styles_Composers.removeBtn} hitSlop={8}>
              <CloseIcon size={16} color={theme.danger} />
            </Pressable>
          )}
        </View>
      ))}
      {options.length < 6 && (
        <Pressable onPress={() => setOptions((prev) => [...prev, ''])} style={({ pressed }) => [styles_Composers.addOption, { borderColor: GREEN_Composers, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles_Composers.addOptionText, { color: GREEN_TEXT }]}>+  Add option</Text>
        </Pressable>
      )}
      {cleaned.length >= 2 && !unique && (
        <Text style={[styles_Composers.warn, { color: theme.danger }]}>Options must be different from each other.</Text>
      )}

      <View style={[styles_Composers.switchRow, { borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles_Composers.switchTitle, { color: theme.headerText }]}>Allow multiple answers</Text>
          <Text style={[styles_Composers.switchSub, { color: theme.placeholder }]}>People can pick more than one option</Text>
        </View>
        <Switch value={multi} onValueChange={setMulti} trackColor={{ true: GREEN_Composers, false: theme.border }} thumbColor="#FFFFFF" />
      </View>
    </Shell>
  );
}

// ─────────────────────────────── EVENT ───────────────────────────────

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return d;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

// ════════════════════════════════════════════════════════════════════════════
// ClockTimePickerModal (Circular clock with centered time & close AM/PM)
// ════════════════════════════════════════════════════════════════════════════

const DIAL_SIZE = 250;
const DIAL_CENTER = DIAL_SIZE / 2; // 125
const DIAL_RADIUS = 92;

const HOURS_LIST = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface ClockTimePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export function ClockTimePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: ClockTimePickerModalProps) {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());
  const switchTimeoutRef = useRef<any>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const isAm = selectedHour < 12;
  const isAmRef = useRef(isAm);
  isAmRef.current = isAm;

  const displayHour = selectedHour % 12 || 12;
  const displayMinute = pad(selectedMinute);

  useEffect(() => {
    if (visible) {
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      setMode('hours');
      setSelectedHour(value.getHours());
      setSelectedMinute(value.getMinutes());
    }
    return () => {
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    };
  }, [visible, value]);

  const toggleAm = (targetAm: boolean) => {
    if (targetAm && selectedHour >= 12) {
      setSelectedHour(selectedHour - 12);
    } else if (!targetAm && selectedHour < 12) {
      setSelectedHour(selectedHour + 12);
    }
  };

  const handleTouch = (evt: GestureResponderEvent, isEnd: boolean = false) => {
    const currentMode = modeRef.current;
    const currentIsAm = isAmRef.current;
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - DIAL_CENTER;
    const dy = locationY - DIAL_CENTER;
    let rad = Math.atan2(dx, -dy);
    if (rad < 0) rad += 2 * Math.PI;

    if (currentMode === 'hours') {
      let h = Math.round(rad / (Math.PI / 6));
      if (h === 0) h = 12;
      const newHour = currentIsAm ? (h % 12) : (h % 12) + 12;
      setSelectedHour(newHour);
      if (isEnd) {
        if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = setTimeout(() => {
          setMode('minutes');
        }, 180);
      }
    } else {
      let m = Math.round(rad / (Math.PI / 30));
      if (m === 60) m = 0;
      setSelectedMinute(m);
    }
  };

  const handleTouchRef = useRef(handleTouch);
  handleTouchRef.current = handleTouch;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleTouchRef.current(e, false),
      onPanResponderMove: (e) => handleTouchRef.current(e, false),
      onPanResponderRelease: (e) => handleTouchRef.current(e, true),
    })
  ).current;

  // Active indicator coordinates
  const activePoint = (() => {
    if (mode === 'hours') {
      const h = selectedHour % 12; // 0..11
      const rad = h * (Math.PI / 6);
      return {
        x: DIAL_CENTER + DIAL_RADIUS * Math.sin(rad),
        y: DIAL_CENTER - DIAL_RADIUS * Math.cos(rad),
      };
    } else {
      const rad = selectedMinute * (Math.PI / 30);
      return {
        x: DIAL_CENTER + DIAL_RADIUS * Math.sin(rad),
        y: DIAL_CENTER - DIAL_RADIUS * Math.cos(rad),
      };
    }
  })();

  const handleConfirm = () => {
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    const next = new Date(value);
    next.setHours(selectedHour, selectedMinute, 0, 0);
    onConfirm(next);
  };

  const handleCancel = () => {
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={clockStyles.backdrop} onPress={handleCancel}>
        <Pressable
          style={[clockStyles.card, { width: Math.min(width - 48, 320) }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header with centered time and close AM/PM */}
          <View style={clockStyles.header}>
            <View style={clockStyles.headerTimeRow}>
              <Pressable
                onPress={() => {
                  if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
                  setMode('hours');
                }}
                hitSlop={6}
              >
                <Text
                  style={[
                    clockStyles.headerDigit,
                    mode === 'hours' && clockStyles.headerDigitActive,
                  ]}
                >
                  {displayHour}
                </Text>
              </Pressable>
              <Text style={clockStyles.headerColon}>:</Text>
              <Pressable
                onPress={() => {
                  if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
                  setMode('minutes');
                }}
                hitSlop={6}
              >
                <Text
                  style={[
                    clockStyles.headerDigit,
                    mode === 'minutes' && clockStyles.headerDigitActive,
                  ]}
                >
                  {displayMinute}
                </Text>
              </Pressable>
              <View style={clockStyles.headerAmpmCol}>
                <Pressable
                  onPress={() => toggleAm(true)}
                  hitSlop={6}
                  style={clockStyles.ampmBtn}
                >
                  <Text
                    style={[
                      clockStyles.headerAmpmText,
                      isAm && clockStyles.headerAmpmActive,
                    ]}
                  >
                    AM
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleAm(false)}
                  hitSlop={6}
                  style={clockStyles.ampmBtn}
                >
                  <Text
                    style={[
                      clockStyles.headerAmpmText,
                      !isAm && clockStyles.headerAmpmActive,
                    ]}
                  >
                    PM
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Clock Dial */}
          <View style={clockStyles.dialContainer}>
            <View style={clockStyles.dialCircle} {...panResponder.panHandlers}>
              {/* SVG Hand & Bubble */}
              <Svg
                width={DIAL_SIZE}
                height={DIAL_SIZE}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                <Line
                  x1={DIAL_CENTER}
                  y1={DIAL_CENTER}
                  x2={activePoint.x}
                  y2={activePoint.y}
                  stroke="#1976D2"
                  strokeWidth={2}
                />
                <Circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={17}
                  fill="#1976D2"
                />
                <Circle
                  cx={DIAL_CENTER}
                  cy={DIAL_CENTER}
                  r={4}
                  fill="#1976D2"
                />
              </Svg>

              {/* Numbers on the dial */}
              {mode === 'hours' &&
                HOURS_LIST.map((h) => {
                  const rad = h * (Math.PI / 6);
                  const x = DIAL_CENTER + DIAL_RADIUS * Math.sin(rad);
                  const y = DIAL_CENTER - DIAL_RADIUS * Math.cos(rad);
                  const isSelected = displayHour === h;
                  return (
                    <View
                      key={h}
                      pointerEvents="none"
                      style={[
                        clockStyles.numWrap,
                        { left: x - 16, top: y - 16 },
                      ]}
                    >
                      <Text
                        style={[
                          clockStyles.numText,
                          isSelected && clockStyles.numTextActive,
                        ]}
                      >
                        {h}
                      </Text>
                    </View>
                  );
                })}

              {mode === 'minutes' &&
                MINUTES_LIST.map((m) => {
                  const rad = m * (Math.PI / 30);
                  const x = DIAL_CENTER + DIAL_RADIUS * Math.sin(rad);
                  const y = DIAL_CENTER - DIAL_RADIUS * Math.cos(rad);
                  const isSelected = selectedMinute === m;
                  return (
                    <View
                      key={m}
                      pointerEvents="none"
                      style={[
                        clockStyles.numWrap,
                        { left: x - 16, top: y - 16 },
                      ]}
                    >
                      <Text
                        style={[
                          clockStyles.numText,
                          isSelected && clockStyles.numTextActive,
                        ]}
                      >
                        {pad(m)}
                      </Text>
                    </View>
                  );
                })}

              {/* Minute display when minute is not multiple of 5 */}
              {mode === 'minutes' && selectedMinute % 5 !== 0 && (
                <View
                  pointerEvents="none"
                  style={[
                    clockStyles.numWrap,
                    { left: activePoint.x - 16, top: activePoint.y - 16 },
                  ]}
                >
                  <Text style={clockStyles.numTextActive}>
                    {pad(selectedMinute)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Footer Actions */}
          <View style={clockStyles.footer}>
            <Pressable onPress={onCancel} style={clockStyles.actionBtn}>
              <Text style={clockStyles.actionText}>CANCEL</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={clockStyles.actionBtn}>
              <Text style={clockStyles.actionText}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const clockStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  header: {
    backgroundColor: '#1976D2',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDigit: {
    fontSize: 52,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  headerDigitActive: {
    color: '#FFFFFF',
  },
  headerColon: {
    fontSize: 48,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginHorizontal: 3,
    marginBottom: 4,
  },
  headerAmpmCol: {
    marginLeft: 10,
    justifyContent: 'center',
    gap: 3,
  },
  ampmBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  headerAmpmText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  headerAmpmActive: {
    color: '#FFFFFF',
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    backgroundColor: '#FFFFFF',
  },
  dialCircle: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: '#ECEFF1',
    position: 'relative',
  },
  numWrap: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  numTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export function EventComposer({
  visible, theme, onClose, onSubmit,
}: { visible: boolean; theme: ComposerTheme; onClose: () => void; onSubmit: (p: RichPayload) => void }) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<Date>(defaultStart());
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  // web fallback: plain text boxes
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');

  useEffect(() => {
    if (!visible) return;
    const d = defaultStart();
    setTitle('');
    setWhen(d);
    setLocation('');
    setDescription('');
    setWebDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setWebTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, [visible]);

  const webValue = (() => {
    const t = new Date(`${webDate}T${webTime}`);
    return isNaN(t.getTime()) ? null : t;
  })();
  const start = Platform.OS === 'web' ? webValue : when;
  const canSubmit = title.trim().length > 0 && !!start;

  const openAndroidDate = () => {
    if (!DateTimeModule?.DateTimePickerAndroid) return;
    try {
      DateTimeModule.DateTimePickerAndroid.open({
        value: when,
        mode: 'date',
        minimumDate: new Date(),
        onValueChange: (_e: any, picked?: Date) => {
          if (!picked) return;
          setWhen((prev) => {
            const next = new Date(prev);
            next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
            return next;
          });
        },
      });
    } catch (_) {}
  };

  const dateLabel = `${WEEKDAYS[when.getDay()]}, ${when.getDate()} ${MONTHS[when.getMonth()]}`;
  const timeLabel = (() => {
    const h = when.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${pad(when.getMinutes())} ${ap}`;
  })();

  return (
    <Shell
      visible={visible}
      title="Create event"
      icon={<CalendarIcon size={20} color={GREEN_Composers} />}
      theme={theme}
      onClose={onClose}
      canSubmit={canSubmit}
      submitLabel="Send event"
      onSubmit={() =>
        start &&
        onSubmit({
          kind: 'event',
          title: title.trim(),
          startsAt: start.toISOString(),
          location: location.trim() || undefined,
          description: description.trim() || undefined,
        })
      }
    >
      <Field label="EVENT NAME" value={title} onChangeText={setTitle} placeholder="e.g. Safety briefing" theme={theme} maxLength={100} />

      <Text style={[styles_Composers.label, { color: theme.placeholder }]}>DATE & TIME</Text>
      {Platform.OS === 'android' && (
        <View style={styles_Composers.whenRow}>
          <Pressable onPress={openAndroidDate} style={[styles_Composers.whenBtn, styles_Composers.whenBtnDate, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <CalendarIcon size={16} color={GREEN_Composers} />
            <Text style={[styles_Composers.whenText, { color: theme.inputText }]} numberOfLines={1}>{dateLabel}</Text>
          </Pressable>
          <Pressable onPress={() => setTimePickerVisible(true)} style={[styles_Composers.whenBtn, styles_Composers.whenBtnTime, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <ClockIcon size={16} color={GREEN_Composers} />
            <Text style={[styles_Composers.whenText, { color: theme.inputText }]} numberOfLines={1}>{timeLabel}</Text>
          </Pressable>
        </View>
      )}
      {Platform.OS === 'ios' && (
        <View style={[styles_Composers.iosPicker, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <DateTimeModule.default
            value={when}
            mode="datetime"
            display="compact"
            minimumDate={new Date()}
            themeVariant="dark"
            accentColor={GREEN_Composers}
            onChange={(_e: any, d?: Date) => d && setWhen(d)}
          />
        </View>
      )}
      {Platform.OS === 'web' && (
        <View style={styles_Composers.whenRow}>
          <TextInput value={webDate} onChangeText={setWebDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder}
            style={[styles_Composers.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.inputText }]} />
          <TextInput value={webTime} onChangeText={setWebTime} placeholder="HH:MM" placeholderTextColor={theme.placeholder}
            style={[styles_Composers.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.inputText }]} />
        </View>
      )}
      <View style={{ height: 12 }} />

      <Field label="LOCATION (OPTIONAL)" value={location} onChangeText={setLocation} placeholder="Where is it?" theme={theme} maxLength={120} />
      <Field label="DETAILS (OPTIONAL)" value={description} onChangeText={setDescription} placeholder="Add a note for the team" theme={theme} multiline maxLength={400} />

      <ClockTimePickerModal
        visible={timePickerVisible}
        value={when}
        onConfirm={(picked) => {
          setWhen(picked);
          setTimePickerVisible(false);
        }}
        onCancel={() => setTimePickerVisible(false)}
      />
    </Shell>
  );
}

const styles_Composers = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 16 },
  card: { borderRadius: 24, borderWidth: 1, padding: 18, maxHeight: '88%', elevation: 16 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  headClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addOption: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 11, alignItems: 'center', marginBottom: 10 },
  addOptionText: { fontSize: 14, fontWeight: '800' },
  warn: { fontSize: 12, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, marginTop: 4, marginBottom: 4 },
  switchTitle: { fontSize: 14.5, fontWeight: '700' },
  switchSub: { fontSize: 12, marginTop: 1 },
  anonBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  anonBannerText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  whenRow: { flexDirection: 'row', gap: 8 },
  whenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 11 },
  whenBtnDate: { flex: 1.25 },
  whenBtnTime: { flex: 0.9 },
  whenText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  iosPicker: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'flex-start' },
  submit: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  submitText: { color: '#0A0E13', fontSize: 15.5, fontWeight: '900', letterSpacing: 0.3 },
});

// ════════════════════════════════════════════════════════════════════════════
// DownloadRing.tsx
// ════════════════════════════════════════════════════════════════════════════

const GREEN_DownloadRing = '#20C65A';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props_DownloadRing {
  /** 0..1 */
  progress: number;
  size?: number;
  /** show the percentage in the middle instead of the arrow */
  showPercent?: boolean;
}

/**
 * The download twin of the upload ring: a dark disc with a green ring that fills smoothly as the file comes in,
 * a soft pulse around it, and a bobbing down arrow (or the percentage) in the middle.
 */
export function DownloadRing({ progress, size = 58, showPercent = false }: Props_DownloadRing) {
  const stroke = size >= 56 ? 3.5 : 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0.04, Math.min(1, progress)); // always a sliver, so it visibly starts

  const fill = useRef(new Animated.Value(target)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, { toValue: target, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [target]);

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    bobLoop.start();
    pulseLoop.start();
    return () => {
      bobLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const arrow = size * 0.4;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Downloading ${percent}%`}>
      {/* soft pulse */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: GREEN_DownloadRing,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
        }}
      />
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(11, 15, 20, 0.72)' }} />
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={GREEN_DownloadRing}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={fill.interpolate({ inputRange: [0, 1], outputRange: [c, 0] }) as any}
        />
      </Svg>
      {showPercent ? (
        <Text style={{ color: '#FFFFFF', fontSize: Math.max(10, size * 0.24), fontWeight: '800', fontVariant: ['tabular-nums'] }}>{percent}%</Text>
      ) : (
        <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.05, size * 0.05] }) }] }}>
          <Svg width={arrow} height={arrow} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5.5 12.5 12 19l6.5-6.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VoiceRecorderPanel.tsx
// ════════════════════════════════════════════════════════════════════════════

export interface RecorderTheme {
  card: string;
  border: string;
  headerText: string;
  placeholder: string;
  danger: string;
}

interface Props_VoiceRecorderPanel {
  theme: RecorderTheme;
  /** space for the gesture bar / navigation buttons under the panel */
  bottomInset: number;
  onSend: (uri: string, ms: number) => void;
  onCancel: () => void;
}

const GREEN_VoiceRecorderPanel = '#20C65A';
const RED = '#F0524D';
const BAR_COUNT = 46;
const MIN_MS = 500; // shorter than this is an accidental tap, not a message

const tap = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
};

/**
 * Voice-note recorder, laid out like WhatsApp's: big timer and a live level meter on top;
 * below, a discard button, a Pause / Resume pill and the green send button.
 * Native recording uses expo-audio (real mic levels); web uses MediaRecorder.
 */
export function VoiceRecorderPanel({ theme, bottomInset, onSend, onCancel }: Props_VoiceRecorderPanel) {
  const [ms, setMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0));

  const isWeb = Platform.OS === 'web';
  const pausedRef = useRef(false);
  const doneRef = useRef(false);
  const clock = useRef({ base: 0, resumedAt: 0 });
  const timer = useRef<any>(null);
  const meter = useRef<any>(null);
  const mediaRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const elapsed = () => clock.current.base + (pausedRef.current ? 0 : Date.now() - clock.current.resumedAt);

  // entrance
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 9, tension: 80, useNativeDriver: true }).start();
  }, []);

  // pulsing red dot while recording; frozen while paused
  useEffect(() => {
    if (paused) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [paused]);

  const startTicking = () => {
    clock.current = { base: 0, resumedAt: Date.now() };
    timer.current = setInterval(() => setMs(elapsed()), 100);
    meter.current = setInterval(() => {
      if (pausedRef.current) return;
      const real = isWeb ? null : safeAudio.getRecordingLevel();
      // the web has no level meter, so gently simulate one
      const level = real ?? 0.12 + 0.55 * Math.abs(Math.sin(Date.now() / 160)) * (0.55 + 0.45 * Math.random());
      setLevels((prev) => [...prev.slice(1), Math.max(0, Math.min(1, level))]);
    }, 80);
  };

  const stopTicking = () => {
    clearInterval(timer.current);
    clearInterval(meter.current);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (isWeb) {
        startTicking();
        try {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new (window as any).MediaRecorder(stream);
            mediaRef.current = mr;
            chunksRef.current = [];
            mr.ondataavailable = (e: any) => e.data.size > 0 && chunksRef.current.push(e.data);
            mr.start();
          }
        } catch (e) {
          console.warn('[VoiceRecorder] Web mic not accessible:', e);
        }
        return;
      }
      const result = await safeAudio.startRecording();
      if (!alive) return;
      if (result === 'ok') {
        startTicking();
      } else {
        doneRef.current = true;
        alert(
          result === 'denied'
            ? 'Microphone permission is needed to record voice notes. Please allow it in your phone Settings.'
            : 'Could not start recording. Please try again.'
        );
        onCancel();
      }
    })();
    return () => {
      alive = false;
      stopTicking();
      // torn down without sending or discarding: release the microphone
      if (!doneRef.current && !isWeb) safeAudio.cancelRecording();
    };
  }, []);

  const togglePause = () => {
    tap();
    if (pausedRef.current) {
      // resume
      const ok = isWeb ? (mediaRef.current?.resume?.(), true) : safeAudio.resumeRecording();
      if (!ok) return;
      clock.current.resumedAt = Date.now();
      pausedRef.current = false;
      setPaused(false);
    } else {
      const ok = isWeb ? (mediaRef.current?.pause?.(), true) : safeAudio.pauseRecording();
      if (!ok) return;
      clock.current.base += Date.now() - clock.current.resumedAt;
      pausedRef.current = true;
      setPaused(true);
      setMs(clock.current.base);
    }
  };

  const discard = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    tap(Haptics.ImpactFeedbackStyle.Medium);
    stopTicking();
    if (isWeb) {
      if (mediaRef.current) {
        mediaRef.current.stop();
        mediaRef.current.stream?.getTracks()?.forEach((t: any) => t.stop());
      }
    } else {
      await safeAudio.cancelRecording();
    }
    onCancel();
  };

  const send = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    tap(Haptics.ImpactFeedbackStyle.Medium);
    const total = elapsed();
    stopTicking();
    if (isWeb) {
      if (mediaRef.current && total >= MIN_MS) {
        mediaRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          mediaRef.current.stream?.getTracks()?.forEach((t: any) => t.stop());
          onSend(URL.createObjectURL(blob), total);
        };
        mediaRef.current.stop();
      } else {
        mediaRef.current?.stop?.();
        onCancel();
      }
      return;
    }
    const rec = await safeAudio.finishRecording();
    if (!rec || rec.durationMs < MIN_MS) {
      onCancel();
      return;
    }
    onSend(rec.uri, rec.durationMs);
  };

  const barColor = 'rgba(255,255,255,0.82)';
  const dotColor = 'rgba(255,255,255,0.30)';
  const statusColor = paused ? '#F5B942' : RED;

  const { width: screenWidth } = useWindowDimensions();
  const isSmall = screenWidth <= 350;
  const isMedium = screenWidth > 350 && screenWidth <= 420;
  const btnSize = isSmall ? 48 : isMedium ? 54 : 60;
  const timerFontSize = isSmall ? 21 : isMedium ? 24 : 27;
  const waveHeight = isSmall ? 32 : 40;

  return (
    <Animated.View
      style={[
        styles_VoiceRecorderPanel.panel,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          paddingBottom: bottomInset + 14,
          paddingHorizontal: isSmall ? 12 : 18,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
        },
      ]}
    >
      {/* Timer · live level meter · status */}
      <View style={styles_VoiceRecorderPanel.topRow}>
        <Text style={[styles_VoiceRecorderPanel.timer, { color: theme.headerText, fontSize: timerFontSize, minWidth: isSmall ? 58 : 72 }]}>
          {formatDuration(ms)}
        </Text>

        <View style={[styles_VoiceRecorderPanel.wave, { height: waveHeight, marginHorizontal: isSmall ? 8 : 12 }]}>
          {levels.map((lv, i) => {
            const quiet = lv < 0.07;
            return (
              <View
                key={i}
                style={{
                  width: isSmall ? 2.5 : 3,
                  borderRadius: 2,
                  height: quiet ? 3 : 4 + lv * (waveHeight - 10),
                  backgroundColor: quiet ? dotColor : barColor,
                  opacity: paused ? 0.45 : 1,
                }}
              />
            );
          })}
          {/* moving edge of the meter */}
          <Animated.View
            style={[
              styles_VoiceRecorderPanel.scrubber,
              {
                backgroundColor: statusColor,
                opacity: paused ? 0.9 : pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] }),
              },
            ]}
          />
        </View>

        <View style={styles_VoiceRecorderPanel.status}>
          <View style={styles_VoiceRecorderPanel.dotWrap}>
            {!paused && (
              <Animated.View
                style={[
                  styles_VoiceRecorderPanel.halo,
                  {
                    backgroundColor: RED,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
                  },
                ]}
              />
            )}
            <View style={[styles_VoiceRecorderPanel.dot, { backgroundColor: statusColor }]} />
          </View>
          <Text style={[styles_VoiceRecorderPanel.statusText, { color: statusColor, fontSize: isSmall ? 10.5 : 12 }]}>
            {paused ? 'Paused' : 'Recording'}
          </Text>
        </View>
      </View>

      {/* Discard · Pause / Resume · Send */}
      <View style={[styles_VoiceRecorderPanel.bottomRow, { marginTop: isSmall ? 16 : 24, gap: isSmall ? 8 : 12 }]}>
        <Pressable
          onPress={discard}
          style={({ pressed }) => [
            styles_VoiceRecorderPanel.trash,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityLabel="Discard recording"
        >
          <Trash2 size={isSmall ? 20 : 24} color={RED} />
        </Pressable>

        <Pressable
          onPress={togglePause}
          style={({ pressed }) => [
            styles_VoiceRecorderPanel.pill,
            { height: btnSize, borderRadius: btnSize / 2 },
            { backgroundColor: 'rgba(255,255,255,0.10)', opacity: pressed ? 0.75 : 1 },
          ]}
          accessibilityLabel={paused ? 'Resume recording' : 'Pause recording'}
        >
          {paused ? (
            <>
              <WaMicIcon size={isSmall ? 19 : 22} color={RED} />
              <Text style={[styles_VoiceRecorderPanel.pillText, { color: theme.headerText, fontSize: isSmall ? 14.5 : 17 }]}>Resume</Text>
            </>
          ) : (
            <>
              <View style={styles_VoiceRecorderPanel.pauseBars}>
                <View style={[styles_VoiceRecorderPanel.pauseBar, { backgroundColor: theme.headerText, height: isSmall ? 16 : 20 }]} />
                <View style={[styles_VoiceRecorderPanel.pauseBar, { backgroundColor: theme.headerText, height: isSmall ? 16 : 20 }]} />
              </View>
              <Text style={[styles_VoiceRecorderPanel.pillText, { color: theme.headerText, fontSize: isSmall ? 14.5 : 17 }]}>Pause</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={send}
          style={({ pressed }) => [
            styles_VoiceRecorderPanel.send,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
          accessibilityLabel="Send voice note"
        >
          <WaSendIcon size={isSmall ? 22 : 26} color="#FFFFFF" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles_VoiceRecorderPanel = StyleSheet.create({
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 22,
    paddingHorizontal: 18,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', height: 44 },
  timer: { fontSize: 27, fontWeight: '500', minWidth: 72, fontVariant: ['tabular-nums'] },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, marginHorizontal: 12 },
  scrubber: { position: 'absolute', right: -3, width: 2.5, height: 36, borderRadius: 2 },
  status: { flexDirection: 'row', alignItems: 'center' },
  dotWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  halo: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  trash: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(240,82,77,0.16)', alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pillText: { fontSize: 17, fontWeight: '700' },
  pauseBars: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 5, height: 20, borderRadius: 2 },
  send: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GREEN_VoiceRecorderPanel,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: GREEN_VoiceRecorderPanel,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
});
