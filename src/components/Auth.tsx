import { type Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import React, { useEffect, useRef, useState, createContext, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { SkfLogo, AnimatedSplashScreen } from './Brand';
import { stopNotifications } from '../services/device';


// ════════════════════════════════════════════════════════════════════════════
// auth.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * Master login. One shared company email + password, verified by Supabase Auth on the server —
 * nothing secret ships inside the app, so someone who is sent the app but not the password
 * cannot open it (and, once supabase/skfl_master_access.sql has been run, cannot read the
 * data either).
 */

export type SignInResult =
  | { ok: true }
  | { ok: false; kind: 'invalid' | 'rate' | 'network' | 'unknown'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export async function signInMaster(email: string, password: string): Promise<SignInResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (!error) return { ok: true };

    if (error.status === 429 || /rate limit|too many/i.test(error.message)) {
      return { ok: false, kind: 'rate', message: 'Too many attempts. Please wait a few minutes and try again.' };
    }
    if (error.name === 'AuthRetryableFetchError' || /fetch|network|timeout/i.test(error.message)) {
      return { ok: false, kind: 'network', message: "Can't reach the server. Check your internet connection." };
    }
    if (error.status === 400 || error.status === 401 || /invalid login|credentials/i.test(error.message)) {
      return { ok: false, kind: 'invalid', message: 'Incorrect email or password.' };
    }
    return { ok: false, kind: 'unknown', message: 'Sign-in failed. Please try again.' };
  } catch {
    return { ok: false, kind: 'network', message: "Can't reach the server. Check your internet connection." };
  }
}

export async function getStoredSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Asks the server whether this saved session is still good. 'revoked' means the master account
 * was removed or its sessions were cleared (kick everyone out); 'unknown' (e.g. offline) keeps the
 * person signed in so the app still opens without internet.
 */
export async function checkSession(): Promise<'valid' | 'revoked' | 'unknown'> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user) return 'valid';
    // Couldn't reach the server (offline): not a reason to sign anyone out
    if (error && (error.name === 'AuthRetryableFetchError' || /fetch|network|timeout/i.test(error.message))) return 'unknown';
    if (
      error &&
      (error.name === 'AuthSessionMissingError' ||
        error.status === 401 ||
        error.status === 403 ||
        /does not exist|not found|invalid jwt|session|refresh token/i.test(error.message))
    ) {
      return 'revoked';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function signOutMaster(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Even if the server can't be reached, drop the local session
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LoginScreen.tsx
// ════════════════════════════════════════════════════════════════════════════

const GOLD = '#E5B24E';
const LOCK_KEY = '@skfl_login_lock';
const MAX_FREE_TRIES = 5;

function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M3.5 7l8.5 6.5L20.5 7" />
    </Svg>
  );
}
function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}
function EyeIcon({ color, off }: { color: string; off: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
      {off && <Path d="M4 4l16 16" />}
    </Svg>
  );
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function LoginScreen({ onSuccess }: { onSuccess?: () => void }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focus, setFocus] = useState<'id' | 'pw' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedFor, setLockedFor] = useState(0);
  const failsRef = useRef(0);
  const pwRef = useRef<TextInput>(null);

  // Entrance: card rises in, error shakes
  const enter = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, []);

  // Keyboard overlap (the app draws edge-to-edge, so the keyboard can cover the fields)
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setKb(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // A lockout survives closing and reopening the app
  useEffect(() => {
    AsyncStorage.getItem(LOCK_KEY)
      .then((raw) => {
        if (!raw) return;
        const { until, fails } = JSON.parse(raw);
        failsRef.current = fails || 0;
        const left = Math.ceil((until - Date.now()) / 1000);
        if (left > 0) setLockedFor(left);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setInterval(() => setLockedFor((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockedFor > 0]);

  const doShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 80, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -0.6, duration: 80, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy && lockedFor === 0;

  const submit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      doShake();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signInMaster(email, password);
    setBusy(false);
    if (res.ok) {
      failsRef.current = 0;
      AsyncStorage.removeItem(LOCK_KEY).catch(() => {});
      onSuccess?.();
      return;
    }
    setError(res.message);
    doShake();
    if (res.kind === 'invalid') {
      failsRef.current += 1;
      if (failsRef.current >= MAX_FREE_TRIES) {
        // 30s, 60s, 120s… capped at 5 minutes
        const secs = Math.min(300, 30 * 2 ** (failsRef.current - MAX_FREE_TRIES));
        setLockedFor(secs);
        AsyncStorage.setItem(LOCK_KEY, JSON.stringify({ until: Date.now() + secs * 1000, fails: failsRef.current })).catch(() => {});
      }
      setPassword('');
    }
  };

  const field = (active: boolean) => [
    styles.field,
    { borderColor: active ? GOLD : 'rgba(255,255,255,0.10)', backgroundColor: active ? 'rgba(229,178,78,0.06)' : '#0B1218' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070D11" translucent />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 + (Platform.OS === 'android' ? kb : 0) },
        ]}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          <SkfLogo size={96} animated={false} showText={false} />

          <View style={{ height: 26 }} />

          <Animated.View
            style={[
              styles.card,
              { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) }] },
            ]}
          >
            <Text style={styles.label}>EMAIL</Text>
            <View style={field(focus === 'id')}>
              <MailIcon color={focus === 'id' ? GOLD : '#7E8F9F'} />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                onFocus={() => setFocus('id')}
                onBlur={() => setFocus(null)}
                placeholder="Enter email address"
                placeholderTextColor="#5C6B78"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                editable={!busy}
                style={styles.input}
              />
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
            <View style={field(focus === 'pw')}>
              <LockIcon color={focus === 'pw' ? GOLD : '#7E8F9F'} />
              <TextInput
                ref={pwRef}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                onFocus={() => setFocus('pw')}
                onBlur={() => setFocus(null)}
                placeholder="Enter password"
                placeholderTextColor="#5C6B78"
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={10} accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                <EyeIcon color="#7E8F9F" off={showPw} />
              </TouchableOpacity>
            </View>

            {lockedFor > 0 ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Too many wrong attempts. Try again in {fmt(lockedFor)}.</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={[styles.button, { opacity: canSubmit || busy ? 1 : 0.45 }]}
            >
              {busy ? <ActivityIndicator color="#1A1204" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070D11' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  card: {
    width: '100%',
    backgroundColor: '#0F171E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 178, 78, 0.22)',
  },
  label: { color: '#8FA0AE', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.3,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#F0F4F8',
    fontSize: 15.5,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { color: '#F87171', fontSize: 13, textAlign: 'center' },
  button: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: { color: '#1A1204', fontSize: 16, fontWeight: '800', letterSpacing: 0.6 },
});

// ════════════════════════════════════════════════════════════════════════════
// AuthGate.tsx
// ════════════════════════════════════════════════════════════════════════════

interface AuthApi {
  /** Signs this phone out of the chat and returns to the Master login. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi>({ signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

const RECHECK_MS = 60_000; // don't ask the server more than once a minute when the app resumes
const STARTUP_CHECK_MS = 6_000; // longest the loading screen waits for the server before trusting the saved login (offline)

/**
 * Everything the user sees before the chat: splash → Master login → chat.
 * The chat is only mounted while a valid Master session exists, so signing out (or the master
 * account being removed) tears the whole chat down.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null); // null = still reading / checking the saved login
  const lastCheck = useRef(0);
  const startupChecked = useRef(false); // the chat never opens before the server has confirmed the saved login

  const signOut = useCallback(async () => {
    await stopNotifications(); // needs the session, so before signing out
    await signOutMaster();
    setSignedIn(false);
  }, []);

  useEffect(() => {
    let alive = true;

    // Start-up: while the SKF loading screen plays, ask the server whether the saved login still works
    // (same account, password not changed, sessions not cleared). Only then does the chat or the login page show.
    (async () => {
      const saved = await getStoredSession();
      if (!alive) return;
      if (!saved) {
        startupChecked.current = true;
        setSignedIn(false);
        return;
      }
      const verdict = await Promise.race([
        checkSession(),
        new Promise<'unknown'>((resolve) => setTimeout(() => resolve('unknown'), STARTUP_CHECK_MS)),
      ]);
      if (!alive) return;
      lastCheck.current = Date.now();
      startupChecked.current = true;
      if (verdict === 'revoked') {
        await signOutMaster(); // wipe the dead session, then show the login page
        if (alive) setSignedIn(false);
      } else {
        setSignedIn(true); // 'unknown' = offline: keep the person in, as before
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Only flip state here — never call back into supabase inside this listener.
      // The saved session (INITIAL_SESSION) is NOT trusted until the start-up check above has passed.
      if (event === 'SIGNED_OUT') setSignedIn(false);
      else if (event === 'SIGNED_IN' && session && startupChecked.current) setSignedIn(true);
    });

    // React Native needs token refresh switched on/off with the app's foreground state
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        if (Date.now() - lastCheck.current > RECHECK_MS) {
          lastCheck.current = Date.now();
          checkSession().then((r) => {
            if (alive && r === 'revoked') signOut();
          });
        }
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    supabase.auth.startAutoRefresh();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      appSub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [signOut]);

  if (!splashDone) return <AnimatedSplashScreen onFinish={() => setSplashDone(true)} />;
  if (signedIn === null) return <View style={{ flex: 1, backgroundColor: '#070D11' }} />;
  if (!signedIn) return <LoginScreen />;

  return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>;
}
