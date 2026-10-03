import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Text,
  Dimensions,
  LayoutChangeEvent,
  UIManager,
  StatusBar,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, G, Path, ClipPath, Text as SvgText, RadialGradient, Circle } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';


// ════════════════════════════════════════════════════════════════════════════
// skfLogoPaths.ts
// ════════════════════════════════════════════════════════════════════════════

// Vector outline of the official SKF monogram, traced from assets/skf_logo.png.
// Coordinates live in a 315x134 box. Each letter is a list of sub-paths so the
// letters can be animated independently. Regenerate rather than hand-editing.
export const SKF_VIEWBOX = { w: 315, h: 134 };

export const SKF_PATHS = {
  S: [
    'M16.67 129.09C15.81 128.89 15.22 128.41 14.88 127.65C14.78 127.41 14.75 125.89 14.75 120.15C14.75 116.19 14.71 109.08 14.66 104.35C14.55 93.38 14.6 92.9 15.75 92.9C16.09 92.9 16.44 93.3 17.2 94.6C17.57 95.23 18.08 96.11 18.35 96.55C18.61 96.99 19.21 98 19.69 98.8C22.41 103.38 25.2 106.92 28.43 109.88C30.98 112.22 31.4 112.59 33.15 113.99C35.84 116.13 36.74 116.81 37.68 117.38C38.16 117.68 38.95 118.22 39.45 118.6C39.95 118.97 40.76 119.5 41.25 119.78C41.74 120.05 42.58 120.53 43.1 120.85C44.28 121.57 46.67 122.82 47.4 123.1C47.7 123.22 48.51 123.6 49.2 123.95C50.41 124.56 51.02 124.77 53.1 125.35C53.62 125.49 54.65 125.9 55.4 126.25C56.14 126.6 57.28 127.04 57.92 127.23C59.71 127.76 60.1 128.07 59.53 128.48C58.59 129.15 56.36 129.24 43.7 129.14C37.9 129.09 31.82 129.08 30.2 129.11C25.81 129.21 17.1 129.19 16.67 129.09Z',
    'M84.97 128.45C84.47 128.28 84.44 128.24 84.56 127.95C84.64 127.71 86.8 126.23 89.12 124.8C91.69 123.22 95.18 118.5 95.84 115.7C96.86 111.4 96.74 104.81 95.59 102.13C93.46 97.16 88.54 92.3 82.75 89.43C82.09 89.11 81.28 88.67 80.95 88.45C80.62 88.24 79.77 87.79 79.05 87.45C78.34 87.11 77.38 86.6 76.93 86.33C76.48 86.05 75.67 85.63 75.13 85.4C74.59 85.16 73.75 84.77 73.25 84.52C72.42 84.11 71.63 83.76 68.25 82.31C67.59 82.02 66.35 81.46 65.5 81.05C64.65 80.65 63.48 80.15 62.9 79.95C62.32 79.75 61.35 79.32 60.73 79C60.12 78.67 59.09 78.19 58.43 77.91C57.78 77.64 56.8 77.21 56.25 76.95C54.16 75.97 51.92 74.97 51.2 74.69C50.06 74.24 49.54 74 48.5 73.44C47.98 73.16 47 72.71 46.34 72.45C45.67 72.2 44.68 71.74 44.14 71.44C43.59 71.14 41.24 69.95 38.9 68.79C28.19 63.48 22.03 58.65 18.82 53.02C16.9 49.65 16.91 49.68 16.39 47.73C16.22 47.09 15.88 46 15.63 45.31C14.21 41.33 14.22 35.22 15.65 30.9C15.95 29.99 16.36 28.62 16.55 27.85C19.1 17.66 30.84 8.29 43.63 6.2C44.97 5.98 46.45 5.71 46.91 5.6C49.07 5.09 50.15 5.62 48.15 6.21C47.24 6.49 46.89 6.67 46.05 7.32C45.66 7.62 44.86 8.19 44.27 8.58C35.77 14.21 33.61 24.66 39.23 32.97C42.57 37.92 51.55 44.52 61.3 49.2C61.99 49.53 62.82 49.94 63.15 50.12C66.7 51.96 72.36 54.79 73.45 55.25C73.95 55.46 74.84 55.9 75.45 56.21C76.05 56.53 76.9 56.92 77.33 57.09C77.75 57.26 79.6 58.17 81.43 59.11C83.25 60.06 85.72 61.32 86.9 61.93C88.08 62.53 89.41 63.24 89.85 63.51C90.29 63.77 91.41 64.36 92.35 64.83C97.95 67.61 98.27 67.78 101.15 69.68C110.62 75.91 115.6 82.53 116.94 90.7C117.45 93.83 117.53 94.61 117.52 96.45C117.49 109.37 111.8 118.48 100.11 124.35C99.83 124.49 99.14 124.78 98.58 124.99C98.01 125.2 96.93 125.69 96.18 126.08C94.99 126.69 94.62 126.83 93.28 127.15C92.44 127.35 91.12 127.69 90.35 127.91C88 128.57 85.9 128.79 84.97 128.45Z',
    'M116.34 44.01C116.18 43.91 115.88 43.64 115.69 43.42C115.33 43 115.28 42.91 113.8 40.35C113.29 39.47 112.66 38.44 112.39 38.05C112.12 37.66 111.54 36.81 111.08 36.15C105.93 28.65 97.7 20.84 88.11 14.35C86.03 12.94 85.23 12.46 82.55 10.99C82.16 10.78 81.31 10.41 80.65 10.17C79.99 9.93 78.98 9.52 78.4 9.27C76.85 8.6 72.86 7.18 71.16 6.71C68.47 5.95 68.04 5.42 69.75 4.94C71.22 4.54 115.38 4.44 116.5 4.85C117.85 5.34 118.14 6.04 118.14 8.85C118.14 23.43 118.01 41.94 117.91 42.5C117.63 44.01 117.13 44.49 116.34 44.01Z',
  ],
  K: [
    'M174.71 128.6C173.36 128.31 172.5 127.47 170.9 124.86C170.27 123.83 169.41 122.46 169 121.82C168.58 121.18 168.07 120.36 167.85 120C167.64 119.64 167.21 118.99 166.9 118.55C166.58 118.11 166.04 117.28 165.68 116.7C165.32 116.12 164.47 114.77 163.78 113.7C161.78 110.57 160.86 109.1 160.4 108.3C160.16 107.89 159.62 107.03 159.2 106.4C158.78 105.77 158.31 105.03 158.16 104.77C158 104.5 157.54 103.75 157.12 103.09C156.24 101.73 154.96 99.71 154.24 98.56C152.69 96.07 151.89 94.81 151.38 94.08C150.56 92.87 149.35 90.9 147.02 87C145.9 85.1 144.69 83.15 144.35 82.65C144.01 82.16 143.56 81.46 143.35 81.1C143.15 80.74 142.56 79.82 142.05 79.05C139.85 75.74 136.84 70.92 136.44 70.05C135.75 68.58 136.11 67.92 141.01 61.75C142.94 59.32 144.09 57.82 146.42 54.71C150.94 48.68 151.88 47.67 153.14 47.53C153.73 47.46 153.79 47.51 154.25 48.57C154.47 49.06 154.86 49.83 155.14 50.3C155.41 50.77 155.91 51.62 156.24 52.2C157.39 54.19 158.55 56.03 159.27 57C159.67 57.54 160.35 58.53 160.78 59.21C161.21 59.89 162.3 61.58 163.2 62.95C164.1 64.33 165.02 65.73 165.25 66.08C165.47 66.43 166.03 67.29 166.49 67.98C166.96 68.68 167.61 69.72 167.95 70.3C168.29 70.88 168.88 71.84 169.27 72.45C170.4 74.21 172.49 77.48 173.03 78.35C173.31 78.79 173.99 79.86 174.54 80.72C176.63 83.99 177.48 85.35 179.54 88.75C180.71 90.67 181.9 92.61 182.19 93.05C182.86 94.08 184.95 97.45 187.13 101C188.47 103.19 189.78 105.25 191.29 107.53C192.35 109.12 192.8 109.85 195.23 113.85C196.16 115.39 197.23 117.22 197.6 117.91C197.97 118.61 198.55 119.58 198.88 120.06C199.21 120.55 199.71 121.38 200.01 121.9C200.3 122.42 200.72 123.14 200.95 123.5C204 128.28 203.9 128.38 196.05 128.4C194.29 128.4 191.41 128.44 189.65 128.49C184.78 128.64 175.21 128.7 174.71 128.6Z',
    'M173.4 23.61C173.21 23.24 173.49 22.25 174.26 20.59C176.15 16.54 176.07 11.24 174.09 8.74C172.38 6.58 172.75 5.86 175.55 5.86C178.73 5.86 189.64 6.11 190.5 6.2C193.53 6.53 194.06 7.21 192.15 8.34C187.63 11.01 185.86 12.46 180.35 18C175.53 22.85 173.76 24.28 173.4 23.61Z',
  ],
  F: [
    'M216.85 128.71C212.37 128.61 211.79 128.37 211.94 126.68C212.23 123.22 212.31 108.88 212.11 94.5C212.04 89.4 211.97 72.77 211.95 55.85C211.91 25.82 211.9 24.66 211.64 22.15C210.96 15.51 209.22 11.75 205.38 8.67C203.33 7.03 203.81 6.35 207.25 6.05C208.21 5.97 236.36 5.97 236.85 6.05C239.07 6.42 239.43 6.98 238.64 8.8C238.24 9.72 238.21 12.1 238.14 47.2C237.97 132.87 238.04 126.95 237.24 127.88C236.63 128.59 236.51 128.61 232.5 128.65C230.55 128.67 226.95 128.7 224.5 128.73C222.05 128.75 218.61 128.75 216.85 128.71Z',
    'M272.25 81.21C272.08 81.11 271.24 80.26 270.38 79.33C268 76.74 266.53 75.58 263.77 74.12C261.25 72.79 261.11 72.72 260.1 72.45C259.58 72.3 258.16 71.9 256.95 71.55C254.78 70.91 254.24 70.78 251.8 70.25C248.73 69.59 249.03 68.99 252.81 68.26C253.82 68.06 255.14 67.77 255.75 67.61C256.36 67.45 257.63 67.11 258.59 66.85C260.45 66.36 260.94 66.16 263.2 64.91C266.13 63.31 269.26 60.69 271.35 58.11C272.52 56.66 273.42 56.6 273.87 57.96C274.19 58.9 274.21 75.32 273.9 78.9C273.72 81.04 273.19 81.79 272.25 81.21Z',
    'M288.94 32.18C288.39 31.6 287.44 30.08 286.7 28.59C286.05 27.3 285.29 26.02 284.21 24.4C280.34 18.58 270.43 11.47 264.29 10.1C263.5 9.93 262.11 9.58 261.2 9.33C260.29 9.08 258.54 8.64 257.3 8.35C253.08 7.35 252.89 6.99 256.3 6.41C258.38 6.05 259.32 5.97 261.55 5.97C262.76 5.97 267.84 5.97 272.85 5.96C289.97 5.94 288.74 5.89 289.6 6.66C290.4 7.38 290.35 6.59 290.35 18.85C290.35 30.46 290.33 31.07 289.87 32C289.59 32.57 289.35 32.62 288.94 32.18Z',
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// SkfLogo.tsx
// ════════════════════════════════════════════════════════════════════════════

export interface SkfLogoProps {
  size?: number;
  /** Show the "Iron and Mining Private Limited" lines under the monogram. */
  showText?: boolean;
  animated?: boolean;
  /** Entrance animation: S, K and F glide in one after another, then a metallic shine sweeps across. */
  assemble?: boolean;
  /** Fired once the three letters have landed. */
  onAssembled?: () => void;
}

const { w: VW, h: VH } = SKF_VIEWBOX;
const TEXT_BAND = 60; // extra viewBox height for the 2-line tagline when showText is on
const LETTERS = ['S', 'K', 'F'] as const;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

let logoCounter = 0;

const GOLD_DARK: [string, string][] = [
  ['0', '#FFF1B8'],
  ['0.3', '#F0C95C'],
  ['0.6', '#D4A030'],
  ['0.8', '#B98520'],
  ['1', '#F3D580'],
];

/** Gold fills for the monogram. */
function GoldDefs({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={`${id}-gold`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VW} y2={VH}>
        {(GOLD_DARK).map(([offset, color]) => (
          <Stop key={offset} offset={offset} stopColor={color} />
        ))}
      </LinearGradient>
    </Defs>
  );
}

const SHINE_W = 60;
const SHINE_LEAN = VH * 0.325; // tilt of the band (about 18°)

/** One-shot metallic shine, clipped to the letters so it never spills onto the background.
 *  Plain SVG props driven from a listener — animated SVG props crash on web. */
function ShineSweep({ id, width, height, vbH, onDone }: { id: string; width: number; height: number; vbH: number; onDone: () => void }) {
  const [x, setX] = useState(-SHINE_W - SHINE_LEAN);
  useEffect(() => {
    const p = new Animated.Value(0);
    const from = -SHINE_W - SHINE_LEAN;
    const sub = p.addListener(({ value }) => setX(from + value * (VW + SHINE_W + SHINE_LEAN - from)));
    const run = Animated.timing(p, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    run.start(({ finished }) => finished && onDone());
    return () => {
      run.stop();
      p.removeListener(sub);
    };
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${VW} ${vbH}`}>
        <Defs>
          <ClipPath id={`${id}-clip`}>
            {LETTERS.map((l) => SKF_PATHS[l].map((d, i) => <Path key={l + i} d={d} />))}
          </ClipPath>
          <LinearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.75" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <G clipPath={`url(#${id}-clip)`}>
          <Path
            d={`M${x + SHINE_LEAN} -5 L${x + SHINE_LEAN + SHINE_W} -5 L${x + SHINE_W} ${VH + 5} L${x} ${VH + 5} Z`}
            fill={`url(#${id}-shine)`}
          />
        </G>
      </Svg>
    </View>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OFFICIAL SKF EMBLEM — TRUE VECTOR
 * The S-K-F monogram is traced from the official artwork into resolution-
 * independent paths (see skfLogoPaths.ts / assets/skf_logo.svg), so it stays
 * razor sharp at any size on any screen. Each letter is its own layer so the
 * splash can bring them in one by one.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const SkfLogo: React.FC<SkfLogoProps> = ({
  size = 200,
  showText = true,
  animated = true,
  assemble = false,
  onAssembled,
}) => {
  const id = useMemo(() => `skf${++logoCounter}`, []);
  const pulse = useRef(new Animated.Value(1)).current;

  const targetWidth = Math.min(size * 1.5, 380);
  const vbH = showText ? VH + TEXT_BAND : VH;
  const targetHeight = (targetWidth * vbH) / VW;

  // One progress value per letter (0 → 1), plus the tagline and shine.
  const letterIn = useRef(LETTERS.map(() => new Animated.Value(assemble ? 0 : 1))).current;
  const extrasIn = useRef(new Animated.Value(assemble ? 0 : 1)).current;
  const [shining, setShining] = useState(false);

  useEffect(() => {
    if (!assemble) return;
    const ease = Easing.bezier(0.16, 1, 0.3, 1);
    const anim = Animated.parallel([
      ...letterIn.map((v, i) =>
        Animated.timing(v, { toValue: 1, duration: 760, delay: 200 + i * 190, easing: ease, useNativeDriver: true })
      ),
      Animated.timing(extrasIn, { toValue: 1, duration: 500, delay: 1000, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && setShining(true));
    // The letters have landed once the last one finishes; tell the splash so it can start writing.
    const landed = setTimeout(() => onAssembled && onAssembled(), 200 + 2 * 190 + 620);
    return () => {
      anim.stop();
      clearTimeout(landed);
    };
  }, [assemble]);

  useEffect(() => {
    if (!animated || assemble) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.025, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.99, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, assemble]);

  const fill = `url(#${id}-gold)`;
  const letterPaths = (l: (typeof LETTERS)[number]) => SKF_PATHS[l].map((d, i) => <Path key={i} d={d} fill={fill} />);

  // ──────────────────── COMPACT BADGE (HEADER) ────────────────────
  if (size <= 56) {
    const tileW = size * 1.6;
    const tileH = size * 0.8;
    const vbW = VW / 0.78;
    const vbHc = vbW / 2;
    return (
      <View
        style={[
          styles.badge,
          {
            width: tileW,
            height: tileH,
            borderColor: 'rgba(255, 223, 115, 0.45)',
          },
        ]}
      >
        <Svg width={tileW} height={tileH} viewBox={`${-(vbW - VW) / 2} ${-(vbHc - VH) / 2} ${vbW} ${vbHc}`}>
          <GoldDefs id={id} />
          {LETTERS.map((l) => (
            <G key={l}>{letterPaths(l)}</G>
          ))}
        </Svg>
      </View>
    );
  }

  // ──────────────────── FULL EMBLEM (SPLASH / LOCK / LOADING / EMPTY) ────────────────────
  const travel = targetWidth * 0.16;
  const from = [
    { translateX: -travel, translateY: 0 }, // S glides in from the left
    { translateX: 0, translateY: travel * 0.9 }, // K rises from below
    { translateX: travel, translateY: 0 }, // F glides in from the right
  ];

  const svgProps = { width: targetWidth, height: targetHeight, viewBox: `0 0 ${VW} ${vbH}` };
  const tagColor = '#E7B94A';

  return (
    <View style={styles.centerContainer}>
      <Animated.View style={{ width: targetWidth, height: targetHeight, transform: [{ scale: pulse }] }}>
        {LETTERS.map((l, i) => (
          <Animated.View
            key={l}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: letterIn[i].interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateX: letterIn[i].interpolate({ inputRange: [0, 1], outputRange: [from[i].translateX, 0] }) },
                  { translateY: letterIn[i].interpolate({ inputRange: [0, 1], outputRange: [from[i].translateY, 0] }) },
                  { scale: letterIn[i].interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                ],
              },
            ]}
          >
            <Svg {...svgProps}>
              <GoldDefs id={id} />
              {letterPaths(l)}
            </Svg>
          </Animated.View>
        ))}

        {showText && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: extrasIn }]}>
            <Svg {...svgProps}>
              <GoldDefs id={id} />
              {/* Line 1: IRON AND MINING */}
              <SvgText
                x={VW / 2}
                y={VH + 22}
                textAnchor="middle"
                fill={tagColor}
                fontSize="17"
                fontFamily={SERIF}
                fontWeight="bold"
                letterSpacing="2"
              >
                IRON AND MINING
              </SvgText>
              {/* Line 2: PRIVATE LIMITED — each letter on the same baseline, no descenders clipped */}
              <SvgText
                x={VW / 2}
                y={VH + 46}
                textAnchor="middle"
                fill={tagColor}
                fontSize="13"
                fontFamily={SERIF}
                letterSpacing="3"
              >
                PRIVATE LIMITED
              </SvgText>
            </Svg>
          </Animated.View>
        )}

        {assemble && shining && (
          <ShineSweep id={id} width={targetWidth} height={targetHeight} vbH={vbH} onDone={() => setShining(false)} />
        )}
      </Animated.View>
    </View>
  );
};

// Aliased export for compatibility
export const WiloLogo = SkfLogo;

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#080E14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

// ════════════════════════════════════════════════════════════════════════════
// AnimatedGradientText.tsx
// ════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// YELLOW WITH A SOFT LIGHT GLINT (LEFT-TO-RIGHT FLOW)
// Just three colours: the yellow base and the bright edge glint. Nothing dark.
// The second half repeats the first, so the loop is seamless.
// ─────────────────────────────────────────────────────────────────────────────
const DARK_COLORS = [
  '#FFDF00', // Yellow Base
  '#FFDF00', // Yellow Base
  '#FFF799', // Bright Edge Glint
  '#FFDF00', // Yellow Base (mid loop point)
  '#FFDF00', // Yellow Base
  '#FFF799', // Bright Edge Glint
  '#FFDF00', // Yellow Base (end loop point)
] as const;

// Web keyframe and CSS class injection (idempotent)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.getElementById('skf-yellow-shade-l2r-style')) {
    const s = document.createElement('style');
    s.id = 'skf-yellow-shade-l2r-style';
    s.innerHTML = `
      @keyframes skfYellowShadeFlowL2R {
        0% { background-position: 200% 50%; }
        100% { background-position: 0% 50%; }
      }
      .skf-gradient-text-dark {
        background: linear-gradient(
          90deg,
          #FFDF00 0%,
          #FFDF00 16%,
          #FFF799 33%,
          #FFDF00 50%,
          #FFDF00 66%,
          #FFF799 83%,
          #FFDF00 100%
        ) !important;
        background-size: 200% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
        color: transparent !important;
        animation: skfYellowShadeFlowL2R 5.5s linear infinite !important;
        display: inline-block !important;
        white-space: nowrap !important;
        font-family: inherit !important;
        user-select: none !important;
        text-shadow: 0 0 16px rgba(255, 223, 0, 0.35);
      }
    `;
    document.head.appendChild(s);
  }
}

// Safely test if native MaskedView is available in current runtime
let MaskedViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    const hasNativeMask =
      (UIManager as any).hasViewManagerConfig
        ? (UIManager as any).hasViewManagerConfig('RNCMaskedView')
        : !!(UIManager as any).getViewManagerConfig?.('RNCMaskedView');
    if (hasNativeMask) {
      MaskedViewComponent = require('@react-native-masked-view/masked-view').default;
    }
  } catch (e) {
    MaskedViewComponent = null;
  }
}

interface Props {
  text: string;
  /** 'center' centres the text in its box (default: left) */
  align?: 'left' | 'center';
  fontSize?: number;
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  letterSpacing?: number;
  /** a loaded custom font; its own weight is baked in, so fontWeight is ignored while it is set */
  fontFamily?: string;
  numberOfLines?: number;
  style?: any;
}

export function AnimatedGradientText({
  text,
  align = 'left',
  fontSize = 20.5,
  fontWeight = '800',
  letterSpacing = 0.35,
  fontFamily,
  numberOfLines = 1,
  style,
}: Props) {
  const fontStyle = {
    ...(fontFamily ? { fontFamily, fontWeight: 'normal' as const } : { fontWeight }),
    textAlign: align,
  };
  const windowW = Dimensions.get('window').width;
  const [containerWidth, setContainerWidth] = useState(Math.min(windowW * 0.72, 340));
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 5.5-second smooth, visible Left-to-Right horizontal flow
    const loop = Animated.loop(
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 5500,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web' && MaskedViewComponent !== null,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 10 && Math.abs(w - containerWidth) > 4) {
      setContainerWidth(w);
    }
  };

  const colors = DARK_COLORS;

  // Web implementation: Hardware-accelerated CSS background-clip with left-to-right flow
  if (Platform.OS === 'web') {
    return (
      <View onLayout={onLayout} style={[styles_AnimatedGradientText.wrap, align === 'center' && styles_AnimatedGradientText.center, style]}>
        <Text
          numberOfLines={numberOfLines}
          // @ts-ignore
          className={'skf-gradient-text-dark'}
          style={[
            styles_AnimatedGradientText.textBase,
            {
              fontSize,
              ...fontStyle,
              letterSpacing,
              // Direct inline CSS with left-to-right flow
              // @ts-ignore
              backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
              // @ts-ignore
              backgroundSize: '200% 100%',
              // @ts-ignore
              WebkitBackgroundClip: 'text',
              // @ts-ignore
              WebkitTextFillColor: 'transparent',
              // @ts-ignore
              backgroundClip: 'text',
              // @ts-ignore
              color: 'transparent',
              // @ts-ignore
              animation: 'skfYellowShadeFlowL2R 5.5s linear infinite',
              // @ts-ignore
              display: 'inline-block',
            },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  // Native with MaskedView: Left-to-Right moving gradient strip
  if (MaskedViewComponent) {
    const MaskedView = MaskedViewComponent;
    const stripWidth = Math.max(containerWidth, 240) * 2;
    // Animating from -W to 0 moves the strip from LEFT TO RIGHT across the entire text
    const translateX = animProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [-Math.max(containerWidth, 240), 0],
    });

    return (
      <View onLayout={onLayout} style={[styles_AnimatedGradientText.wrap, align === 'center' && styles_AnimatedGradientText.center, style]}>
        <MaskedView
          style={{ width: '100%', height: Math.max(fontSize * 1.8, 38), justifyContent: 'center' }}
          maskElement={
            <View style={styles_AnimatedGradientText.maskContainer}>
              <Text
                numberOfLines={numberOfLines}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  styles_AnimatedGradientText.textBase,
                  {
                    fontSize,
                    ...fontStyle,
                    letterSpacing,
                    color: '#000000', // fully opaque for mask alpha
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                {text}
              </Text>
            </View>
          }
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: stripWidth,
              transform: [{ translateX }],
            }}
          >
            <ExpoLinearGradient
              colors={colors as any}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      </View>
    );
  }

  // Fallback: a smooth yellow to light-glint cycle on native if the MaskedView native module isn't loaded
  const fallbackColor = animProgress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ['#FFDF00', '#FFF799', '#FFDF00', '#FFF799', '#FFDF00', '#FFDF00'],
  });

  return (
    <View onLayout={onLayout} style={[styles_AnimatedGradientText.wrap, align === 'center' && styles_AnimatedGradientText.center, style]}>
      <Animated.Text
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[
          styles_AnimatedGradientText.textBase,
          {
            fontSize,
            ...fontStyle,
            letterSpacing,
            color: fallbackColor,
          },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

const styles_AnimatedGradientText = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
  },
  maskContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  textBase: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

// ════════════════════════════════════════════════════════════════════════════
// SplashScreen.tsx
// ════════════════════════════════════════════════════════════════════════════

const { width: SW, height: SH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH — only the brand, nothing else:
//   1. the S-K-F monogram glides in letter by letter, then a shine sweeps over it
//   2. the company line is written out underneath, character by character
// Gold bubbles drift up from the bottom and, mirrored, fall from the top. No line, no percentages, no status text.
// ─────────────────────────────────────────────────────────────────────────────

const TAGLINE = 'Iron and Mining Private Limited';
const CHARS = Array.from(TAGLINE);
const CHAR_MS = 58; // time to write one character
const HOLD_UNTIL_MS = 3650; // when the splash starts fading out

const LOGO_SIZE = Math.min(200, SW * 0.5); // SkfLogo renders at size * 1.5 wide
const LOGO_W = Math.min(LOGO_SIZE * 1.5, 380);
const LOGO_H = (LOGO_W * SKF_VIEWBOX.h) / SKF_VIEWBOX.w;
const GLOW = LOGO_W * 1.55;
const TAG_SIZE = Math.min(17, Math.max(12, Math.round(SW * 0.043))); // starting guess; Tagline shrinks it further if it still doesn't fit
const TAG_MAX_WIDTH = SW - 64; // clear of the screen edges (container's 24px padding × 2, plus a safety margin)
const SERIF_SplashScreen = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// Slow gold dust drifting upward behind everything.
const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  left: ((i * 73) % 100) / 100,
  size: 2 + (i % 3),
  duration: 5200 + (i % 5) * 900,
  delay: (i * 370) % 2600,
  rise: SH * (0.35 + (i % 4) * 0.1),
}));

// The same gold bubbles, mirrored: they start at the top and fall to the bottom.
const DROPS = Array.from({ length: 14 }, (_, i) => ({
  left: ((i * 97 + 23) % 100) / 100,
  size: 2 + (i % 3),
  duration: 5200 + ((i + 2) % 5) * 900,
  delay: (i * 370 + 600) % 2600,
  fall: SH * (0.35 + (i % 4) * 0.1),
}));

function Spark({ left, size, duration, delay, rise }: (typeof SPARKS)[number]) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left * SW,
        bottom: SH * 0.12,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#F3D580',
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.75, 0.5, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) }],
      }}
    />
  );
}

/** Gold bubble falling from top to bottom — the mirror image of Spark. */
function Drop({ left, size, duration, delay, fall }: (typeof DROPS)[number]) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left * SW,
        top: SH * 0.12,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#F3D580',
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.75, 0.5, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, fall] }) }],
      }}
    />
  );
}

/**
 * The company line, written left to right with a small gold pen glowing at the writing edge. Every character
 * is its own Animated.Text (so each can fade/slide in on its own), which the row lays out at natural width —
 * on a narrow phone that natural width can run past the screen edge. The full line stays invisible (write = 0)
 * until the logo has assembled, so there is time to measure it and, if it is too wide, shrink the font and
 * measure again — a step no wider phone ever needs, and one this narrow phone never shows happening.
 */
function Tagline({ write }: { write: Animated.Value }) {
  const n = CHARS.length;
  const laid = useRef<{ x: number; w: number }[]>([]);
  const [edges, setEdges] = useState<number[] | null>(null);
  const [fontSize, setFontSize] = useState(TAG_SIZE);
  const shrinkAttempts = useRef(0);

  // Once every character is measured, the pen knows where each character ends — unless the line still
  // overflows, in which case shrink the font and measure this same line again.
  const onCharLayout = (i: number) => (e: any) => {
    laid.current[i] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
    if (laid.current.filter(Boolean).length !== n) return;

    const first = laid.current[0];
    const last = laid.current[n - 1];
    const totalWidth = last.x + last.w - first.x;

    if (totalWidth > TAG_MAX_WIDTH && shrinkAttempts.current < 4 && fontSize > 10) {
      shrinkAttempts.current += 1;
      laid.current = [];
      setFontSize((s) => Math.max(10, Math.floor(s * (TAG_MAX_WIDTH / totalWidth) * 0.96)));
      return;
    }
    setEdges([first.x, ...laid.current.map((c) => c.x + c.w)]);
  };

  return (
    <View style={styles_SplashScreen.tagRow}>
      {CHARS.map((ch, i) => (
        <Animated.Text
          key={i}
          onLayout={onCharLayout(i)}
          style={[
            styles_SplashScreen.tagChar,
            { fontSize },
            {
              opacity: write.interpolate({ inputRange: [i, i + 1], outputRange: [0, 1], extrapolate: 'clamp' }),
              transform: [
                // The last character's own range would run past where `write` ever reaches (n), so it never
                // fully settled and sat a little low forever — capping the range at n fixes just that one.
                { translateY: write.interpolate({ inputRange: [i, Math.min(i + 1.4, n)], outputRange: [6, 0], extrapolate: 'clamp' }) },
              ],
            },
          ]}
        >
          {ch === ' ' ? ' ' : ch}
        </Animated.Text>
      ))}
      {edges && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles_SplashScreen.pen,
            {
              opacity: write.interpolate({ inputRange: [0, 0.05, n - 0.6, n], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateX: write.interpolate({ inputRange: edges.map((_, i) => i), outputRange: edges }) }],
            },
          ]}
        />
      )}
    </View>
  );
}

export function AnimatedSplashScreen({ onFinish }: { onFinish: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const write = useRef(new Animated.Value(0)).current;
  const writing = useRef<Animated.CompositeAnimation | null>(null);

  // Called by the logo once S, K and F have landed.
  const startWriting = useCallback(() => {
    writing.current = Animated.timing(write, {
      toValue: CHARS.length,
      duration: CHARS.length * CHAR_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    writing.current.start();
  }, []);

  useEffect(() => {
    const swing = (v: Animated.Value, ms: number, ease = Easing.inOut(Easing.sin)) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: ease, useNativeDriver: true }),
        ])
      );

    const enter = Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true });
    const glowLoop = swing(breathe, 1800);
    enter.start();
    glowLoop.start();

    const leave = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onFinish());
    }, HOLD_UNTIL_MS);

    return () => {
      clearTimeout(leave);
      enter.stop();
      glowLoop.stop();
      writing.current && writing.current.stop();
    };
  }, []);

  return (
    <Animated.View style={[styles_SplashScreen.container, { opacity: fade }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070D11" translucent={true} />

      {SPARKS.map((s, i) => (
        <Spark key={i} {...s} />
      ))}
      {DROPS.map((d, i) => (
        <Drop key={`drop-${i}`} {...d} />
      ))}

      <View style={styles_SplashScreen.stage}>
        <View style={styles_SplashScreen.logoStage}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles_SplashScreen.glow,
              {
                top: (LOGO_H + 12) / 2 - GLOW / 2,
                opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
              },
            ]}
          >
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#E5B24E" stopOpacity="0.3" />
                  <Stop offset="0.55" stopColor="#E5B24E" stopOpacity="0.08" />
                  <Stop offset="1" stopColor="#E5B24E" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#splashGlow)" />
            </Svg>
          </Animated.View>

          <SkfLogo size={LOGO_SIZE} showText={false} animated={false} assemble onAssembled={startWriting} />
        </View>

        <Tagline write={write} />
      </View>
    </Animated.View>
  );
}


const styles_SplashScreen = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D11',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stage: {
    alignItems: 'center',
    width: '100%',
  },
  logoStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: TAG_MAX_WIDTH,
    marginTop: 24,
  },
  tagChar: {
    color: '#F1D27A',
    letterSpacing: 1.4,
    fontFamily: SERIF_SplashScreen,
    textShadowColor: 'rgba(229, 178, 78, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  pen: {
    position: 'absolute',
    left: 0,
    top: 1,
    bottom: 1,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: '#FFE9A0',
    shadowColor: '#F3D580',
    shadowOpacity: 0.95,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});

// ════════════════════════════════════════════════════════════════════════════
// ChatBackdrop.tsx
// ════════════════════════════════════════════════════════════════════════════

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * REALISTIC GOLDEN STARRY SKY BACKDROP (DELICATE CELESTIAL PROPORTIONS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Stars in the real night sky are sharp, tiny luminous pinpricks (1–2.3px)
 * with subtle atmospheric scintillation and delicate warm-gold halos.
 *
 * Features:
 *   1. Realistic Pinprick Stars:
 *      - Delicate core sizes (0.9px – 2.3px), never oversized or blurry blobs.
 *      - Authentic atmospheric glow-up, gentle shimmer, and glow-down.
 *      - Rich golden & warm yellow celestial colors (#FFFDE7, #FFE57F, #FFD54F, #E5B24E).
 *      - Fine hair-thin cross glints (diffraction flares) on bright stars.
 *      - Dynamic relocation to non-fixed spots across the sky after each cycle.
 *      - Distinct pacing for each star (varied cycle tempos and pauses).
 *   2. "Broken Star" (Shooting Star / Meteor Break-up):
 *      - Fires every ~10 seconds!
 *      - Strictly flows from RIGHT to LEFT with a randomized start point every pass.
 *      - Razor-sharp needle streak with a tiny glowing head, tapered golden tail,
 *        and micro ember sparks.
 *   3. Ambient Breathing Gold SKF Monogram.
 *   4. Zero-overhead 60 FPS performance: 100% native driver, pointerEvents="none".
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GOLD = '#E5B24E';

// Rich golden and warm yellow celestial spectrum ("yellow ness color full")
const GOLD_STAR_COLORS_DARK = [
  '#FFFFFF', // Pure stellar white-hot core
  '#FFFDE7', // Warm incandescent gold-white
  '#FFF59D', // Soft luminous yellow
  '#FFE57F', // Warm golden glow
  '#FFD54F', // Pure celestial gold
  '#FFCA28', // Intense gold amber
  '#E5B24E', // SKF corporate gold
];

const GOLD_STAR_COLORS_LIGHT = [
  '#D97706', // Amber gold
  '#B45309', // Deep bronze gold
  '#F59E0B', // Warm golden yellow
  '#E5B24E', // Bright gold
];

const STAR_COUNT = 24; // Balanced celestial field across the screen
const MIN_GAP = 42; // Organic separation so stars never crowd each other

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Coordinates registry to prevent clumping
const takenSpots = new Map<number, { x: number; y: number }>();

function pickSpot(id: number, width: number, height: number) {
  // SKF watermark dimensions and exclusion zone
  const markW = Math.min(width * 0.72, 340);
  const markH = markW * (SKF_VIEWBOX.h / SKF_VIEWBOX.w);
  const padX = 24; // Generous margin so star glows and flares never touch the letters
  const padY = 24;
  const logoLeft = width / 2 - markW / 2 - padX;
  const logoRight = width / 2 + markW / 2 + padX;
  const logoTop = height / 2 - markH / 2 - padY;
  const logoBottom = height / 2 + markH / 2 + padY;

  const isInWatermark = (x: number, y: number) => {
    return x >= logoLeft && x <= logoRight && y >= logoTop && y <= logoBottom;
  };

  // Safe fallback initialized well outside the watermark (in upper celestial sky)
  let best = { x: width * 0.5, y: height * 0.12 };
  let bestGap = -1;

  for (let i = 0; i < 90; i++) {
    const c = {
      x: rand(width * 0.04, width * 0.96),
      y: rand(height * 0.03, height * 0.93),
    };

    // STRICT: Never place normal stars inside or overlapping the SKF logo text
    if (isInWatermark(c.x, c.y)) {
      continue;
    }

    let gap = Infinity;
    takenSpots.forEach((o, k) => {
      if (k !== id) gap = Math.min(gap, Math.hypot(o.x - c.x, o.y - c.y));
    });

    if (gap >= MIN_GAP) return c;
    if (gap > bestGap) {
      bestGap = gap;
      best = c;
    }
  }
  return best;
}

interface StarLook {
  size: number;
  color: string;
  spikes: boolean;
  peak: number;
}

/**
 * Generates true-to-life star proportions:
 * Real stars are tiny pinpricks of light, not large disks!
 */
function generateRealisticLook(isDark: boolean): StarLook {
  const palette = isDark ? GOLD_STAR_COLORS_DARK : GOLD_STAR_COLORS_LIGHT;
  const color = palette[Math.floor(Math.random() * palette.length)];
  const r = Math.random();

  if (r > 0.82) {
    // Bright focal star: 2.0px - 2.4px pinprick with delicate diffraction glint
    return { size: rand(2.0, 2.4), color, spikes: true, peak: rand(0.92, 1.0) };
  }
  if (r > 0.45) {
    // Normal medium star: 1.4px - 1.8px
    return { size: rand(1.4, 1.8), color, spikes: false, peak: rand(0.75, 0.92) };
  }
  // Delicate faint distant star: 0.9px - 1.3px pinprick
  return { size: rand(0.9, 1.3), color, spikes: false, peak: rand(0.45, 0.72) };
}

/**
 * Single Realistic Golden Star
 * Rises gently with soft golden aura, scintillates at peak,
 * smoothly dims down, and relocates to a fresh random coordinate!
 */
const GlowingStar = React.memo(function GlowingStar({ id, isDark }: { id: number; isDark: boolean }) {
  const t = useRef(new Animated.Value(0)).current; // 0..1 brightness
  const pos = useRef(new Animated.ValueXY({ x: -60, y: -60 })).current;
  const [look, setLook] = useState<StarLook>(() => generateRealisticLook(isDark));

  useEffect(() => {
    let alive = true;
    let timer: any;

    const cycle = () => {
      if (!alive) return;
      const { width, height } = Dimensions.get('window');

      // Relocate star to a fresh, non-fixed position while invisible
      const spot = pickSpot(id, width, height);
      takenSpots.set(id, spot);
      pos.setValue(spot);
      const nextLook = generateRealisticLook(isDark);
      setLook(nextLook);

      const peak = nextLook.peak;
      // Individual pacing for every star ("another pace the start glow")
      const riseTime = rand(1400, 2800);
      const fadeTime = rand(1600, 3200);

      const steps: Animated.CompositeAnimation[] = [
        // 1. Smooth glow up in warm golden radiance
        Animated.timing(t, {
          toValue: peak,
          duration: riseTime,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ];

      // 2. Realistic subtle twinkle at peak (atmospheric scintillation)
      const scintillations = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < scintillations; i++) {
        steps.push(
          Animated.timing(t, {
            toValue: peak * rand(0.68, 0.88),
            duration: rand(80, 160),
            useNativeDriver: true,
          }),
          Animated.timing(t, {
            toValue: peak * rand(0.94, 1.0),
            duration: rand(90, 180),
            useNativeDriver: true,
          })
        );
      }

      // 3. Smooth glow down into darkness
      steps.push(
        Animated.timing(t, {
          toValue: 0,
          duration: fadeTime,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        })
      );

      Animated.sequence(steps).start(({ finished }) => {
        takenSpots.delete(id); // Free coordinate once completely faded
        if (finished && alive) {
          // Pause between cycles before illuminating at a new spot
          timer = setTimeout(cycle, rand(800, 3800));
        }
      });
    };

    // Stagger initial start times across a natural window
    timer = setTimeout(cycle, rand(100, 4500));

    return () => {
      alive = false;
      clearTimeout(timer);
      t.stopAnimation();
      takenSpots.delete(id);
    };
  }, [isDark]);

  const core = look.size;
  // Subtle, tight realistic halos (never big blurry disks)
  const glowInner = core + 2.4; // 3.3px - 4.8px total width
  const glowOuter = core + 5.6; // 6.5px - 8.0px total width
  const spikeArm = 8.5; // Fine 8.5px celestial cross glint
  const haloColor = isDark ? '#FFE082' : '#D97706';

  return (
    <Animated.View pointerEvents="none" style={[styles_ChatBackdrop.starAnchor, { transform: pos.getTranslateTransform() }]}>
      {/* Outer subtle golden shimmer halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: glowOuter,
          height: glowOuter,
          borderRadius: glowOuter / 2,
          left: -glowOuter / 2,
          top: -glowOuter / 2,
          backgroundColor: haloColor,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, isDark ? 0.14 : 0.07] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.2] }) }],
        }}
      />

      {/* Inner tight golden aura */}
      <Animated.View
        style={{
          position: 'absolute',
          width: glowInner,
          height: glowInner,
          borderRadius: glowInner / 2,
          left: -glowInner / 2,
          top: -glowInner / 2,
          backgroundColor: look.color,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, isDark ? 0.35 : 0.2] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }],
        }}
      />

      {/* Fine hair-thin 4-point cross glint on brightest stars */}
      {look.spikes && (
        <Animated.View
          style={{
            position: 'absolute',
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, isDark ? 0.65 : 0.35] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.05] }) }],
          }}
        >
          {/* Horizontal delicate ray */}
          <View
            style={{
              position: 'absolute',
              width: spikeArm,
              height: 0.7,
              left: -spikeArm / 2,
              top: -0.35,
              backgroundColor: '#FFF9C4',
              borderRadius: 0.5,
            }}
          />
          {/* Vertical delicate ray */}
          <View
            style={{
              position: 'absolute',
              width: 0.7,
              height: spikeArm,
              left: -0.35,
              top: -spikeArm / 2,
              backgroundColor: '#FFF9C4',
              borderRadius: 0.5,
            }}
          />
        </Animated.View>
      )}

      {/* Crisp Core Pinprick Star Body */}
      <Animated.View
        style={{
          position: 'absolute',
          width: core,
          height: core,
          borderRadius: core / 2,
          left: -core / 2,
          top: -core / 2,
          backgroundColor: look.color,
          opacity: t,
        }}
      />
    </Animated.View>
  );
});

const METEOR_TAIL_SEGMENTS = 18;
const METEOR_TAIL_LENGTH = 135;

/**
 * Broken Star (Realistic Meteor Break-up):
 *   - Strict Restriction: Exactly ONE broken star at a time, NEVER two!
 *   - Global mutex lock prevents overlapping animations across any re-renders or mounts.
 *   - Clean single incandescent head with a continuous tapered stardust tail.
 *   - Every 10 seconds, exactly one single broken star sweeps edge-to-edge.
 */
let globalShootingStarActive = false;
let globalShootingStarTimer: any = null;

function BrokenShootingStar({ isDark }: { isDark: boolean }) {
  const p = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [shot, setShot] = useState({
    startX: 400,
    startY: 80,
    endX: -60,
    endY: 340,
    angle: 150,
  });

  useEffect(() => {
    let alive = true;
    let count = 0;

    const fire = () => {
      if (!alive) return;

      // STRICT RESTRICTION: If a broken star is already flying, never start another!
      if (globalShootingStarActive) return;
      globalShootingStarActive = true;

      if (globalShootingStarTimer) {
        clearTimeout(globalShootingStarTimer);
        globalShootingStarTimer = null;
      }

      const { width, height } = Dimensions.get('window');
      count++;

      // Alternates or randomly chooses direction:
      // ~65% Right-to-Left, and ~35% Left-to-Right
      const fromRight = count % 3 !== 0;

      let startX: number, startY: number, endX: number, endY: number;

      if (fromRight) {
        // Starts on / beyond the RIGHT edge and travels FULLY across to the LEFT edge
        startX = width * rand(0.96, 1.15);
        startY = height * rand(0.04, 0.45);
        endX = width * rand(-0.35, -0.10);
        // Slanted downwards to the left
        endY = startY + (startX - endX) * rand(0.35, 0.65);
      } else {
        // Starts on / beyond the LEFT edge and travels FULLY across to the RIGHT edge
        startX = width * rand(-0.15, 0.04);
        startY = height * rand(0.04, 0.45);
        endX = width * rand(1.10, 1.35);
        // Slanted downwards to the right
        endY = startY + (endX - startX) * rand(0.35, 0.65);
      }

      // Compute exact mathematical flight angle
      const angleRad = Math.atan2(endY - startY, endX - startX);
      const angle = angleRad * (180 / Math.PI);

      setShot({ startX, startY, endX, endY, angle });
      p.setValue(0);

      // Fast, graceful single meteor sweep across the full screen
      const anim = Animated.timing(p, {
        toValue: 1,
        duration: rand(950, 1250),
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
      animRef.current = anim;

      anim.start(({ finished }) => {
        animRef.current = null;
        p.setValue(0);
        // Release active lock ONLY after current meteor has completely finished and faded
        globalShootingStarActive = false;

        if (finished && alive) {
          if (globalShootingStarTimer) clearTimeout(globalShootingStarTimer);
          // STRICT RESTRICTION: Wait 10 full seconds before the next single star fires
          globalShootingStarTimer = setTimeout(fire, 10000);
        }
      });
    };

    // Clean up any stale timer from previous instance
    if (globalShootingStarTimer) {
      clearTimeout(globalShootingStarTimer);
      globalShootingStarTimer = null;
    }
    globalShootingStarActive = false;

    // First single meteor launches shortly after mount (2.5s)
    globalShootingStarTimer = setTimeout(fire, 2500);

    return () => {
      alive = false;
      globalShootingStarActive = false;
      if (globalShootingStarTimer) {
        clearTimeout(globalShootingStarTimer);
        globalShootingStarTimer = null;
      }
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      p.stopAnimation();
    };
  }, []);

  const translateX = p.interpolate({
    inputRange: [0, 1],
    outputRange: [shot.startX, shot.endX],
  });
  const translateY = p.interpolate({
    inputRange: [0, 1],
    outputRange: [shot.startY, shot.endY],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        opacity: p.interpolate({
          inputRange: [0, 0.05, 0.85, 1],
          outputRange: [0, isDark ? 1 : 0.85, isDark ? 0.9 : 0.75, 0],
        }),
        transform: [
          { translateX },
          { translateY },
          { rotate: `${shot.angle}deg` },
        ],
      }}
    >
      {/* Razor-thin tapered golden comet tail streaming behind the head */}
      <View
        style={{
          position: 'absolute',
          left: -METEOR_TAIL_LENGTH,
          top: -0.7,
          width: METEOR_TAIL_LENGTH,
          height: 1.4,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: METEOR_TAIL_SEGMENTS }).map((_, i) => {
          const f = (i + 1) / METEOR_TAIL_SEGMENTS;
          const isNearHead = i >= METEOR_TAIL_SEGMENTS - 3;
          const segmentColor = isNearHead ? '#FFFDE7' : i > 7 ? '#FFD54F' : '#E5B24E';

          return (
            <View
              key={`seg-${i}`}
              style={{
                width: METEOR_TAIL_LENGTH / METEOR_TAIL_SEGMENTS,
                height: 0.35 + f * 0.95,
                backgroundColor: segmentColor,
                opacity: 0.03 + f * f * 0.95,
              }}
            />
          );
        })}
      </View>

      {/* Needle-sharp golden meteor head centered at (0, 0) - ONE single star */}
      <View
        style={{
          position: 'absolute',
          left: -4,
          top: -4,
          width: 8,
          height: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Soft golden outer halo */}
        <View
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#FFB300',
            opacity: isDark ? 0.45 : 0.3,
          }}
        />
        {/* Bright golden inner nucleus */}
        <View
          style={{
            position: 'absolute',
            width: 3.8,
            height: 3.8,
            borderRadius: 1.9,
            backgroundColor: '#FFD54F',
            opacity: 0.9,
          }}
        />
        {/* Stellar white-hot core */}
        <View
          style={{
            width: 1.8,
            height: 1.8,
            borderRadius: 0.9,
            backgroundColor: '#FFFFFF',
          }}
        />
      </View>
    </Animated.View>
  );
}

/**
 * Ambient Breathing Gold SKF Monogram
 */
function Watermark({ isDark }: { isDark: boolean }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const markW = Math.min(Dimensions.get('window').width * 0.72, 340);
  const markH = markW * (SKF_VIEWBOX.h / SKF_VIEWBOX.w);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles_ChatBackdrop.center]} pointerEvents="none">
      <Animated.View
        style={{
          opacity: breathe.interpolate({
            inputRange: [0, 1],
            outputRange: isDark ? [0.12, 0.22] : [0.07, 0.15],
          }),
        }}
      >
        <Svg width={markW} height={markH} viewBox={`0 0 ${SKF_VIEWBOX.w} ${SKF_VIEWBOX.h}`}>
          {(['S', 'K', 'F'] as const).flatMap((k) =>
            SKF_PATHS[k].map((d, i) => <Path key={`${k}${i}`} d={d} fill={GOLD} />)
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

export interface ChatBackdropProps {
  isDark?: boolean;
}

export const ChatBackdrop = React.memo(function ChatBackdrop({ isDark = true }: ChatBackdropProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Delicate Realistic Golden Stars */}
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <GlowingStar key={`star-${i}`} id={i} isDark={isDark} />
      ))}

      {/* Official Gold SKF Watermark */}
      <Watermark isDark={isDark} />

      {/* Broken Shooting Star every 10 seconds from Right to Left */}
      <BrokenShootingStar isDark={isDark} />
    </View>
  );
});

const styles_ChatBackdrop = StyleSheet.create({
  starAnchor: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
