import React from 'react';
import { View, Text, Image as RNImage } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';


// ════════════════════════════════════════════════════════════════════════════
// Icons.tsx
// ════════════════════════════════════════════════════════════════════════════

export interface IconProps {
  size?: number;
  color?: string;
  style?: any;
}

// ──────────────────── 1. EXACT USER CIRCLE MICROPHONE ICON ────────────────────
// Loaded from c:\Users\K S KALATHIYA\Downloads\SKF App\client\icon\circle-microphone.svg
export const CircleMicrophoneIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', style }) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm0,22c-5.514,0-10-4.486-10-10S6.486,2,12,2s10,4.486,10,10-4.486,10-10,10Zm6-10c0,2.968-2.166,5.439-5,5.916v1.084c0,.552-.447,1-1,1s-1-.448-1-1v-1.084c-2.834-.477-5-2.948-5-5.916,0-.552.447-1,1-1s1,.448,1,1c0,2.206,1.794,4,4,4s4-1.794,4-4c0-.552.447-1,1-1s1,.448,1,1Zm-8,0v-5c0-1.105.895-2,2-2s2,.895,2,2v5c0,1.105-.895,2-2,2s-2-.895-2-2Z"
          fill={color}
        />
      </Svg>
    </View>
  );
};
// Refined microphone: solid capsule + pickup arc + stand. Reads clearly at small sizes.
export const MicIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', style }) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={color} />
        <Path d="M5 11.5a7 7 0 0 0 14 0" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <Line x1="12" y1="18.5" x2="12" y2="21.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <Line x1="8.5" y1="21.5" x2="15.5" y2="21.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      </Svg>
    </View>
  );
};
export const Mic = MicIcon;

// ──────────────────── 4. HIGH-ENGAGING PIN / PAPERCLIP ────────────────────
export const Paperclip: React.FC<IconProps> = ({ size = 22, color = '#E5B24E', style }) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </Svg>
    </View>
  );
};
export const PinIcon = Paperclip;

// ──────────────────── 5. SUPERSONIC SEND ARROW ────────────────────
export const Send: React.FC<IconProps> = ({ size = 20, color = '#0A0E13', style }) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Paper plane with a folded wing */}
        <Path d="M21.6 2.6 2.9 9.9c-.8.3-.8 1.4 0 1.7l6.9 2.7 2.7 6.9c.3.8 1.4.8 1.7 0l7.4-18.6c.3-.8-.3-1.4-1-1.2Z" fill={color} />
        <Path d="M9.8 14.3 21 3.2" stroke={color === '#FFFFFF' ? '#0A0E13' : '#FFFFFF'} strokeOpacity={0.55} strokeWidth="1.4" strokeLinecap="round" />
      </Svg>
    </View>
  );
};
export const SendIcon = Send;

// ──────────────────── 6. MEDIA ICONS (GALLERY, DOCUMENT, AUDIO) ────────────────────
export const GalleryIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', style }) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Rect width="18" height="18" x="3" y="3" rx="3" ry="3" />
        <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
        <Path d="m21 15-5-5L5 21" />
      </Svg>
    </View>
  );
};
export const Image = GalleryIcon;

export const DocumentIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', style }) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <Path d="M14 2v6h6" />
        <Line x1="16" x2="8" y1="13" y2="13" />
        <Line x1="16" x2="8" y1="17" y2="17" />
        <Line x1="10" x2="8" y1="9" y2="9" />
      </Svg>
    </View>
  );
};
export const FileText = DocumentIcon;

// ──────────────────── 7. UTILITY ICONS ────────────────────
export const Video: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>🎬</Text>
);

export const Shield: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>🛡</Text>
);

export const HardDrive: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>💾</Text>
);

export const Wifi: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>📡</Text>
);

export const Users: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>👥</Text>
);

export const X: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.85, color, fontWeight: '700' }, style]}>✕</Text>
);

export const Settings: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>⚙</Text>
);

export const RefreshCw: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>↻</Text>
);

// ──────────────────── 7. WHATSAPP DOUBLE & SINGLE TICK ICONS ────────────────────
// Loaded from assets/double-tick.png
const doubleTickImg = require('../../assets/double-tick.png');

export const DoubleTickIcon: React.FC<IconProps> = ({ size = 16, color = '#34B7F1', style }) => {
  return (
    <View style={[{ width: size * 1.15, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <RNImage
        source={doubleTickImg}
        style={{
          width: size * 1.15,
          height: size,
          tintColor: color,
        }}
        resizeMode="contain"
      />
    </View>
  );
};
export const CheckCheck = DoubleTickIcon;
export const DoubleTick = DoubleTickIcon;

export const SingleTickIcon: React.FC<IconProps> = ({ size = 15, color = '#7E8F9F', style }) => {
  return (
    <View style={[{ width: size * 0.9, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size * 0.9} height={size} viewBox="0 0 20 20" fill="none">
        <Path
          d="M3.5 10.8L8.2 15.5L16.5 5.5"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};
export const Check = SingleTickIcon;
export const SingleTick = SingleTickIcon;

export const Clock: React.FC<IconProps> = ({ size = 13, color = '#7E8F9F', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </Svg>
  </View>
);

export const Play: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Rounded play triangle, optically nudged right so it looks centered in a circle */}
      <Path d="M8.2 4.9c0-1 1.1-1.6 1.9-1.1l9.4 6.1c.8.5.8 1.7 0 2.2l-9.4 6.1c-.8.5-1.9-.1-1.9-1.1V4.9Z" fill={color} transform="translate(0.6 1)" />
    </Svg>
  </View>
);

export const Pause: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="5.5" y="4" width="4.6" height="16" rx="1.6" fill={color} />
      <Rect x="13.9" y="4" width="4.6" height="16" rx="1.6" fill={color} />
    </Svg>
  </View>
);

export const Download: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>⬇</Text>
);

/** Arrow into a tray: the download button on attachments */
export const DownloadIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 4v11.5" />
      <Path d="M7 11l5 5 5-5" />
      <Path d="M5 19.5h14" />
    </Svg>
  </View>
);

export const Trash2: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.5 6.5h17" />
      <Path d="M9 6.5V4.2c0-.4.3-.7.7-.7h4.6c.4 0 .7.3.7.7v2.3" />
      <Path d="M5.8 6.5 6.7 19a2 2 0 0 0 2 1.9h6.6a2 2 0 0 0 2-1.9l.9-12.5" />
      <Path d="M10 10.5v6M14 10.5v6" />
    </Svg>
  </View>
);

/** WhatsApp-style delete: the outlined bin with a lid and two slats (Material "delete_outline") */
export const DeleteIcon: React.FC<IconProps> = ({ size = 24, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        fillRule="evenodd"
        d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13zM9 8h2v9H9zm4 0h2v9h-2z"
      />
    </Svg>
  </View>
);

export const Copy: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>📋</Text>
);

export const Smile: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <Text style={[{ fontSize: size * 0.9, color }, style]}>😊</Text>
);

// ──────────────────── 8. MESSAGE ACTION ICONS ────────────────────
export const PencilIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h4.2L19.4 8.8a2.1 2.1 0 0 0 0-3l-1.2-1.2a2.1 2.1 0 0 0-3 0L4 15.8V20Z" />
      <Path d="m13.5 6.5 4 4" />
    </Svg>
  </View>
);

/** Circle with a slash, used for "This message was deleted" */
export const BanIcon: React.FC<IconProps> = ({ size = 16, color = '#8696A0', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M5.6 5.6l12.8 12.8" />
    </Svg>
  </View>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 18, color = '#8696A0', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <Path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  </View>
);

/** Trash with a cross, for "delete for everyone" */
export const TrashAllIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.5 6.5h17" />
      <Path d="M9 6.5V4.2c0-.4.3-.7.7-.7h4.6c.4 0 .7.3.7.7v2.3" />
      <Path d="M5.8 6.5 6.7 19a2 2 0 0 0 2 1.9h6.6a2 2 0 0 0 2-1.9l.9-12.5" />
      <Path d="m10 11 4 5m0-5-4 5" />
    </Svg>
  </View>
);

export const ReplyIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v1" />
    </Svg>
  </View>
);

// ──────────────────── 9. WHATSAPP SELECTION & ACTION ICONS ────────────────────
export const ArrowLeft: React.FC<IconProps> = ({ size = 22, color = '#FFFFFF', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  </View>
);

export const MoreVertical: React.FC<IconProps> = ({ size = 22, color = '#FFFFFF', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="12" cy="5" r="2.2" />
      <Circle cx="12" cy="12" r="2.2" />
      <Circle cx="12" cy="19" r="2.2" />
    </Svg>
  </View>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 20, color = '#FFFFFF', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="16" x2="12" y2="12" />
      <Circle cx="12" cy="8" r="0.8" fill={color} stroke="none" />
    </Svg>
  </View>
);

export const CopyActionIcon: React.FC<IconProps> = ({ size = 20, color = '#FFFFFF', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  </View>
);

export const PinActionIcon: React.FC<IconProps> = ({ size = 20, color = '#FFFFFF', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="17" x2="12" y2="22" />
      <Path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z" />
    </Svg>
  </View>
);

export const CheckmarkIcon: React.FC<IconProps> = ({ size = 22, color = '#FFFFFF', style }) => (
  <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// AttachIcons.tsx
// ════════════════════════════════════════════════════════════════════════════

interface IconProps_AttachIcons {
  size?: number;
  color?: string;
}

const Box: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
);

export const CameraIcon: React.FC<IconProps_AttachIcons> = ({ size = 22, color = '#FF2E74' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7.5h3l1.5-2.2a1 1 0 0 1 .8-.4h5.4a1 1 0 0 1 .8.4L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"
        fill={color}
      />
      <Circle cx="12" cy="13.2" r="3.7" fill="#0B0F14" opacity={0.85} />
      <Circle cx="12" cy="13.2" r="2.1" fill={color} />
    </Svg>
  </Box>
);

/** Headphones: importing an audio file from the device */
export const AudioFileIcon: React.FC<IconProps_AttachIcons> = ({ size = 22, color = '#FA6533' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 15.5v-3.2a7.5 7.5 0 0 1 15 0v3.2" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Rect x="2.8" y="14" width="4.6" height="7" rx="2" fill={color} />
      <Rect x="16.6" y="14" width="4.6" height="7" rx="2" fill={color} />
    </Svg>
  </Box>
);

export const ContactIcon: React.FC<IconProps_AttachIcons> = ({ size = 22, color = '#009DE2' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4.4" fill={color} />
      <Path d="M3.5 20.5a8.5 8.5 0 0 1 17 0v.3a.7.7 0 0 1-.7.7H4.2a.7.7 0 0 1-.7-.7v-.3Z" fill={color} />
    </Svg>
  </Box>
);

export const PollIcon: React.FC<IconProps_AttachIcons> = ({ size = 22, color = '#FFBC38' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="4.6" height="9.5" rx="1.6" fill={color} />
      <Rect x="9.7" y="3.5" width="4.6" height="17" rx="1.6" fill={color} />
      <Rect x="16.4" y="8" width="4.6" height="12.5" rx="1.6" fill={color} />
    </Svg>
  </Box>
);

export const CalendarIcon: React.FC<IconProps_AttachIcons> = ({ size = 22, color = '#FF2E74' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4.5" width="18" height="16.5" rx="3.2" fill={color} />
      <Rect x="3" y="4.5" width="18" height="5" rx="3" fill={color} />
      <Line x1="3.6" y1="9.6" x2="20.4" y2="9.6" stroke="#0B0F14" strokeOpacity={0.35} strokeWidth="1.2" />
      <Rect x="7.2" y="2.4" width="2.2" height="4.2" rx="1.1" fill={color} stroke="#0B0F14" strokeOpacity={0.4} strokeWidth="0.8" />
      <Rect x="14.6" y="2.4" width="2.2" height="4.2" rx="1.1" fill={color} stroke="#0B0F14" strokeOpacity={0.4} strokeWidth="0.8" />
      <Circle cx="8.3" cy="14.3" r="1.3" fill="#0B0F14" opacity={0.75} />
      <Circle cx="12" cy="14.3" r="1.3" fill="#0B0F14" opacity={0.75} />
      <Circle cx="15.7" cy="14.3" r="1.3" fill="#0B0F14" opacity={0.75} />
      <Circle cx="8.3" cy="17.8" r="1.3" fill="#0B0F14" opacity={0.75} />
      <Circle cx="12" cy="17.8" r="1.3" fill="#0B0F14" opacity={0.75} />
    </Svg>
  </Box>
);

/** Small pin / clock / people glyphs used inside the cards */
export const PinDropIcon: React.FC<IconProps_AttachIcons> = ({ size = 14, color = '#8696A0' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Circle cx="12" cy="9.5" r="2.4" fill={color} />
    </Svg>
  </Box>
);

export const ClockIcon: React.FC<IconProps_AttachIcons> = ({ size = 14, color = '#8696A0' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5.2l3.4 2" />
    </Svg>
  </Box>
);

export const PhoneIcon: React.FC<IconProps_AttachIcons> = ({ size = 16, color = '#009DE2' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5.2 3.5h3l1.6 4.2-2 1.4a11 11 0 0 0 5.1 5.1l1.4-2 4.2 1.6v3a2 2 0 0 1-2.2 2C10.4 18.300 5.700 13.600 3.200 5.700a2 2 0 0 1 2-2.200Z" />
    </Svg>
  </Box>
);

export const UserPlusIcon: React.FC<IconProps_AttachIcons> = ({ size = 16, color = '#20C65A' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="10" cy="8" r="3.8" />
      <Path d="M3 20a7 7 0 0 1 12.400-4.400" />
      <Path d="M19 14v6M16 17h6" />
    </Svg>
  </Box>
);

export const CheckMarkIcon: React.FC<IconProps_AttachIcons> = ({ size = 14, color = '#0A0E13' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <Path d="m5 12.500 4.500 4.500L19 7.500" />
    </Svg>
  </Box>
);

/** Smiley face: the emoji button in the message bar */
export const SmileyIcon: React.FC<IconProps_AttachIcons> = ({ size = 24, color = '#D1D7DB' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.2" />
      <Path d="M8.2 14.2a4.5 4.5 0 0 0 7.6 0" />
      <Circle cx="9" cy="9.6" r="0.9" fill={color} stroke="none" />
      <Circle cx="15" cy="9.6" r="0.9" fill={color} stroke="none" />
    </Svg>
  </Box>
);

/** Speech bubble: used for "Reply" in the message menu (deliberately not an arrow) */
export const ChatBubbleIcon: React.FC<IconProps_AttachIcons> = ({ size = 22, color = '#0A0E13' }) => (
  <Box size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.500v8a2.500 2.500 0 0 1-2.500 2.500H12l-4.400 3.600a.6.6 0 0 1-1-.470V17h-1.100A2.500 2.500 0 0 1 3 14.500v-8A2.500 2.500 0 0 1 5.500 4Z" fill={color} />
      <Rect x="7.500" y="8.500" width="9" height="1.700" rx="0.850" fill="#FFFFFF" opacity={0.85} />
      <Rect x="7.500" y="11.700" width="5.500" height="1.700" rx="0.850" fill="#FFFFFF" opacity={0.85} />
    </Svg>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// WaIcons.tsx
// ════════════════════════════════════════════════════════════════════════════

/**
 * Icons for the message bar, drawn to match the WhatsApp Android look:
 * a solid send arrow, a solid microphone, a slanted paperclip, an outline camera,
 * and an outline keyboard / backspace.
 */

interface IconProps_WaIcons {
  size?: number;
  color?: string;
}

const Box_WaIcons: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
);

export const WaSendIcon: React.FC<IconProps_WaIcons> = ({ size = 24, color = '#FFFFFF' }) => (
  <Box_WaIcons size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" fill={color} />
    </Svg>
  </Box_WaIcons>
);

export const WaMicIcon: React.FC<IconProps_WaIcons> = ({ size = 24, color = '#FFFFFF' }) => (
  <Box_WaIcons size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
        fill={color}
      />
    </Svg>
  </Box_WaIcons>
);

/** Paperclip, tilted the way WhatsApp draws it */
export const WaAttachIcon: React.FC<IconProps_WaIcons> = ({ size = 24, color = '#AEBAC1' }) => (
  <Box_WaIcons size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        transform="translate(12 12) rotate(45) scale(0.86) translate(-12 -12)"
        d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"
        fill={color}
      />
    </Svg>
  </Box_WaIcons>
);

export const CameraOutlineIcon: React.FC<IconProps_WaIcons> = ({ size = 24, color = '#AEBAC1' }) => (
  <Box_WaIcons size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7.5h3l1.5-2.2a1 1 0 0 1 .8-.4h5.4a1 1 0 0 1 .8.4L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" />
      <Circle cx="12" cy="13.2" r="3.6" />
    </Svg>
  </Box_WaIcons>
);

export const KeyboardIcon: React.FC<IconProps_WaIcons> = ({ size = 24, color = '#AEBAC1' }) => (
  <Box_WaIcons size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2.5" y="5.5" width="19" height="13" rx="2.6" />
      <Path d="M6.5 9.3h.01M10 9.3h.01M14 9.3h.01M17.5 9.3h.01M6.5 12.6h.01M10 12.6h.01M14 12.6h.01M17.5 12.6h.01" strokeWidth="2.4" />
      <Path d="M8 15.8h8" />
    </Svg>
  </Box_WaIcons>
);

export const BackspaceIcon: React.FC<IconProps_WaIcons> = ({ size = 24, color = '#AEBAC1' }) => (
  <Box_WaIcons size={size}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.2 5.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.2a2 2 0 0 1-1.6-.8L3 12l4.6-5.7a2 2 0 0 1 1.6-.8Z" />
      <Path d="m11.5 9.5 5 5m0-5-5 5" />
    </Svg>
  </Box_WaIcons>
);
