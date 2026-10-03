import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Linking, Platform, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { RichPayload, EVENT_CHOICES, type ResponseRow } from '../services/chat';
import { PollIcon, CalendarIcon, ClockIcon, PinDropIcon, PhoneIcon, UserPlusIcon, CheckMarkIcon } from './Icons';
// WhatsApp green for polls, events and their buttons (replaces the yellow accent)
const GREEN = '#20C65A';
const GREEN_TEXT = '#22B95B';


export interface CardTheme {
  accent: string;
  accentGold: string;
  placeholder: string;
  inText: string;
  outText: string;
  border: string;
  inputBg: string;
  danger: string;
}

type Poll = Extract<RichPayload, { kind: 'poll' }>;
type EventP = Extract<RichPayload, { kind: 'event' }>;
type Contact = Extract<RichPayload, { kind: 'contact' }>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function clock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m}\u00A0${ap}`;
}

function stamp(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

// ─────────────────────────────── POLL ───────────────────────────────

function PollOption({
  label, count, total, selected, disabled, theme, onPress, hasVotes,
}: {
  label: string; count: number; total: number; selected: boolean; disabled: boolean; theme: CardTheme; onPress: () => void;
  hasVotes: boolean;
}) {
  const pct = hasVotes && total > 0 ? count / total : 0;
  const pctText = `${Math.round(pct * 100)}%`;
  const fill = useRef(new Animated.Value(pct)).current;
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const mounted = useRef(false);
  const fillAnim = useRef<Animated.CompositeAnimation | null>(null);
  const selAnim = useRef<Animated.CompositeAnimation | null>(null);

  // The result bar always eases to its new share of the votes — selecting, deselecting, or someone
  // else voting all move it the same smooth way, so two bars changing together read as one motion
  // (a redistribution) instead of one snapping while the other glides.
  useEffect(() => {
    fillAnim.current?.stop();
    fillAnim.current = Animated.timing(fill, {
      toValue: pct,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    fillAnim.current.start();
  }, [pct]);

  // Selecting and deselecting are the same transition run in either direction, so the option you tapped
  // away from fades out exactly as smoothly as the one you tapped in — no instant snap on either side.
  useEffect(() => {
    selAnim.current?.stop();
    selAnim.current = Animated.parallel([
      Animated.timing(sel, {
        toValue: selected ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(checkOpacity, {
        toValue: selected ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    selAnim.current.start();
    if (selected && mounted.current) {
      pop.setValue(0.3);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 170, useNativeDriver: true }).start();
    }
    mounted.current = true;
  }, [selected]);

  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress} disabled={disabled}>
        <Animated.View
          style={[
            styles.pollOpt,
            {
              borderColor: sel.interpolate({ inputRange: [0, 1], outputRange: [theme.border, GREEN] }),
              backgroundColor: sel.interpolate({ inputRange: [0, 1], outputRange: [theme.inputBg, GREEN + '15'] }),
            },
          ]}
        >
          {/* result bar */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pollFill,
              {
                backgroundColor: sel.interpolate({ inputRange: [0, 1], outputRange: [GREEN + '22', GREEN + '45'] }),
                width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
          <View style={styles.pollOptContent}>
            <Animated.View
              style={[
                styles.pollDot,
                {
                  backgroundColor: sel.interpolate({ inputRange: [0, 1], outputRange: ['rgba(32,198,90,0)', GREEN] }),
                  borderColor: sel.interpolate({ inputRange: [0, 1], outputRange: [theme.placeholder, GREEN] }),
                },
              ]}
            >
              <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: pop }] }}>
                <CheckMarkIcon size={11} color="#0A0E13" />
              </Animated.View>
            </Animated.View>
            <Text style={[styles.pollLabel, { color: theme.inText, fontWeight: selected ? '700' : '500' }]} numberOfLines={2}>
              {label}
            </Text>
            {hasVotes && (
              <Text style={[styles.pollPct, { color: selected ? GREEN_TEXT : theme.placeholder }]}>{pctText}</Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function PollCard({
  payload, rows, myId, canVote, onVote, theme, width, footerRight,
}: {
  payload: Poll; rows: ResponseRow[]; myId?: string; canVote: boolean; onVote: (choice: string) => void; theme: CardTheme; width: number;
  footerRight?: React.ReactNode;
}) {
  const counts = payload.options.map((_, i) => rows.filter((r) => r.choice === String(i)).length);
  const voters = new Set(rows.map((r) => r.client_id)).size;
  const mine = new Set(rows.filter((r) => r.client_id === myId).map((r) => r.choice));
  const total = Math.max(voters, 1);

  return (
    <View style={{ width }}>
      <View style={[styles.cardKicker, { marginBottom: 6 }]}>
        <PollIcon size={14} color={GREEN} />
        <Text style={[styles.kickerText, { color: GREEN_TEXT }]}>POLL</Text>
      </View>

      <Text style={[styles.pollQuestion, { color: theme.inText }]}>{payload.question}</Text>
      <Text style={[styles.pollHint, { color: theme.placeholder }]}>
        {payload.multi ? 'Select one or more' : 'Select one'}
      </Text>

      {payload.options.map((opt, i) => (
        <PollOption
          key={i}
          label={opt}
          count={counts[i]}
          total={total}
          selected={mine.has(String(i))}
          disabled={!canVote}
          theme={theme}
          onPress={() => onVote(String(i))}
          hasVotes={voters > 0}
        />
      ))}

      <View style={styles.pollFooterRow}>
        <Text style={[styles.pollFooter, { color: theme.placeholder }]}>
          {voters} {voters === 1 ? 'vote' : 'votes'}
        </Text>
        {footerRight}
      </View>
    </View>
  );
}

// ─────────────────────────────── EVENT ───────────────────────────────

function RsvpButton({
  label, count, on, disabled, theme, onPress,
}: {
  label: string; count: number; on: boolean; disabled: boolean; theme: CardTheme; onPress: () => void;
}) {
  const sel = useRef(new Animated.Value(on ? 1 : 0)).current; // colours (JS)
  const press = useRef(new Animated.Value(1)).current;        // native
  const bump = useRef(new Animated.Value(1)).current;         // native: the count pops when it changes
  const first = useRef(true);
  const lastCount = useRef(count);

  useEffect(() => {
    Animated.timing(sel, { toValue: on ? 1 : 0, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [on]);

  useEffect(() => {
    if (!first.current && lastCount.current !== count) {
      bump.setValue(1.5);
      Animated.spring(bump, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    }
    first.current = false;
    lastCount.current = count;
  }, [count]);

  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  const textColor = sel.interpolate({ inputRange: [0, 1], outputRange: [theme.inText, '#0A0E13'] });
  const subColor = sel.interpolate({ inputRange: [0, 1], outputRange: [theme.placeholder, '#0A0E13'] });

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: press }] }}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress} disabled={disabled}>
        <Animated.View
          style={[
            styles.rsvpBtn,
            {
              borderColor: sel.interpolate({ inputRange: [0, 1], outputRange: [theme.border, GREEN] }),
              backgroundColor: sel.interpolate({ inputRange: [0, 1], outputRange: [theme.inputBg, GREEN] }),
            },
          ]}
        >
          <Animated.Text style={[styles.rsvpLabel, { color: textColor, fontWeight: on ? '900' : '700' }]} numberOfLines={1}>
            {label}
          </Animated.Text>
          <Animated.View style={{ transform: [{ scale: bump }] }}>
            <Animated.Text style={[styles.rsvpCount, { color: subColor }]}>{count}</Animated.Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function EventCard({
  payload, rows, myId, canVote, onVote, theme, width,
}: {
  payload: EventP; rows: ResponseRow[]; myId?: string; canVote: boolean; onVote: (choice: string) => void; theme: CardTheme; width: number;
}) {
  const start = new Date(payload.startsAt);
  const valid = !isNaN(start.getTime());
  const ended = valid && start.getTime() < Date.now();
  const mine = new Set(rows.filter((r) => r.client_id === myId).map((r) => r.choice));

  const addToCalendar = () => {
    if (!valid) return;
    Haptics.selectionAsync().catch(() => {});
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const q = [
      'action=TEMPLATE',
      `text=${encodeURIComponent(payload.title)}`,
      `dates=${stamp(start)}/${stamp(end)}`,
      payload.description ? `details=${encodeURIComponent(payload.description)}` : '',
      payload.location ? `location=${encodeURIComponent(payload.location)}` : '',
    ].filter(Boolean).join('&');
    const url = `https://calendar.google.com/calendar/render?${q}`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url).catch(() => {});
  };

  const handleRsvp = (choiceId: string) => {
    onVote(choiceId);
  };

  return (
    <View style={{ width }}>
      <View style={[styles.cardKicker, { marginBottom: 6 }]}>
        <CalendarIcon size={14} color={GREEN} />
        <Text style={[styles.kickerText, { color: GREEN_TEXT }]}>EVENT</Text>
        {ended && (
          <View style={[styles.endedTag, { borderColor: theme.placeholder }]}>
            <Text style={[styles.endedText, { color: theme.placeholder }]}>Ended</Text>
          </View>
        )}
      </View>

      <View style={styles.eventTop}>
        {valid && (
          <View style={[styles.dateBadge, { borderColor: GREEN + '88', backgroundColor: theme.inputBg }]}>
            <View style={[styles.dateBadgeTop, { backgroundColor: GREEN }]}>
              <Text style={styles.dateBadgeMonth}>{MONTHS[start.getMonth()].toUpperCase()}</Text>
            </View>
            <Text style={[styles.dateBadgeDay, { color: theme.inText }]}>{start.getDate()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventTitle, { color: theme.inText }]} numberOfLines={2}>{payload.title}</Text>

          {/* Clean one-line date format */}
          {valid && (
            <View style={styles.metaRow}>
              <CalendarIcon size={12} color={GREEN} />
              <Text style={[styles.metaText, { color: theme.inText, fontWeight: '700' }]} numberOfLines={1}>
                {WEEKDAYS[start.getDay()]}, {start.getDate()} {MONTHS[start.getMonth()]} {start.getFullYear()}
              </Text>
            </View>
          )}

          {/* Clean time row with tight kerning and no extra space */}
          {valid && (
            <View style={styles.metaRow}>
              <ClockIcon size={12} color={GREEN_TEXT} />
              <Text style={[styles.metaText, { color: theme.placeholder }]} numberOfLines={1}>
                {clock(start)}
              </Text>
            </View>
          )}

          {/* Location row */}
          {!!payload.location && (
            <View style={styles.metaRow}>
              <PinDropIcon size={12} color={GREEN} />
              <Text style={[styles.metaText, { color: theme.placeholder }]} numberOfLines={1}>{payload.location}</Text>
            </View>
          )}
        </View>
      </View>

      {!!payload.description && (
        <Text style={[styles.eventDesc, { color: theme.inText }]} numberOfLines={4}>{payload.description}</Text>
      )}

      {/* RSVP Buttons with live counts */}
      <View style={styles.rsvpRow}>
        {EVENT_CHOICES.map((c) => (
          <RsvpButton
            key={c.id}
            label={c.label}
            count={rows.filter((r) => r.choice === c.id).length}
            on={mine.has(c.id)}
            disabled={!canVote}
            theme={theme}
            onPress={() => handleRsvp(c.id)}
          />
        ))}
      </View>

      {valid && (
        <TouchableOpacity onPress={addToCalendar} activeOpacity={0.7} style={styles.calBtn}>
          <CalendarIcon size={14} color={GREEN} />
          <Text style={[styles.calBtnText, { color: GREEN_TEXT }]}>Add to calendar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────── CONTACT ───────────────────────────────

export function ContactCard({ payload, theme, width }: { payload: Contact; theme: CardTheme; width: number }) {
  const initial = (payload.name.trim()[0] || '?').toUpperCase();

  const call = (n: string) => Linking.openURL(`tel:${n.replace(/\s+/g, '')}`).catch(() => {});

  const save = async () => {
    try {
      const Contacts = require('expo-contacts/legacy');
      await Contacts.presentFormAsync(null, {
        name: payload.name,
        firstName: payload.name,
        phoneNumbers: payload.phones.map((number) => ({ number, label: 'mobile' })),
        emails: (payload.emails || []).map((email) => ({ email, label: 'work' })),
      });
    } catch (e) {
      console.warn('[Contact] save failed:', e);
    }
  };

  return (
    <View style={{ width }}>
      <View style={styles.contactTop}>
        <View style={[styles.contactAvatar, { backgroundColor: GREEN }]}>
          <Text style={styles.contactInitial}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.contactName, { color: theme.inText }]} numberOfLines={2}>{payload.name}</Text>
          {payload.phones.slice(0, 3).map((n, i) => (
            <Text key={i} style={[styles.contactPhone, { color: theme.placeholder }]} numberOfLines={1}>{n}</Text>
          ))}
          {!!payload.emails?.[0] && (
            <Text style={[styles.contactPhone, { color: theme.placeholder }]} numberOfLines={1}>{payload.emails[0]}</Text>
          )}
        </View>
      </View>

      <View style={[styles.contactActions, { borderTopColor: theme.border }]}>
        {payload.phones[0] && Platform.OS !== 'web' && (
          <TouchableOpacity onPress={() => call(payload.phones[0])} activeOpacity={0.7} style={styles.contactBtn}>
            <PhoneIcon size={16} color={GREEN} />
            <Text style={[styles.contactBtnText, { color: GREEN_TEXT }]}>Call</Text>
          </TouchableOpacity>
        )}
        {Platform.OS !== 'web' && (
          <TouchableOpacity onPress={save} activeOpacity={0.7} style={styles.contactBtn}>
            <UserPlusIcon size={16} color={GREEN} />
            <Text style={[styles.contactBtnText, { color: GREEN_TEXT }]}>Save contact</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anonKickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardKicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kickerText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.4 },
  anonPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  anonPillText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },

  pollQuestion: { fontSize: 15.5, fontWeight: '800', lineHeight: 21 },
  pollHint: { fontSize: 11.5, marginTop: 2, marginBottom: 10 },
  pollOpt: { minHeight: 46, borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, height: '100%' },
  pollOptContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, width: '100%', minHeight: 46, zIndex: 2 },
  pollDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  pollLabel: { flex: 1, fontSize: 14, letterSpacing: 0.1 },
  pollStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  pollPct: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'], marginLeft: 8 },
  pollCount: { fontSize: 11.5, fontWeight: '600' },
  pollFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 2 },
  pollFooter: { fontSize: 11.5, fontWeight: '600' },
  pollEncryptedNotice: { fontSize: 10, fontWeight: '600', opacity: 0.8 },

  endedTag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 },
  endedText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dateBadge: { width: 50, borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  dateBadgeTop: { width: '100%', alignItems: 'center', paddingVertical: 3 },
  dateBadgeMonth: { color: '#0A0E13', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  dateBadgeDay: { fontSize: 22, fontWeight: '900', paddingVertical: 3 },
  eventTitle: { fontSize: 15.5, fontWeight: '800', lineHeight: 20, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  metaText: { fontSize: 12.5, flexShrink: 1, letterSpacing: 0.1 },
  eventDesc: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  rsvpRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  rsvpBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 9, alignItems: 'center' },
  rsvpLabel: { fontSize: 12, letterSpacing: 0.2 },
  rsvpCount: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  calBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 10, paddingBottom: 2 },
  calBtnText: { fontSize: 12.5, fontWeight: '800' },

  contactTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactInitial: { color: '#0A0E13', fontSize: 19, fontWeight: '900' },
  contactName: { fontSize: 15.5, fontWeight: '800' },
  contactPhone: { fontSize: 12.5, marginTop: 2 },
  contactActions: { flexDirection: 'row', borderTopWidth: 1, marginTop: 2 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  contactBtnText: { fontSize: 13, fontWeight: '800' },
});
