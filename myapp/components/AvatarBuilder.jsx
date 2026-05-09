import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import {SvgXml} from 'react-native-svg';

// Avatar config options

const AVATAR_OPTIONS = {
  gender: ['girl', 'boy'],

  skinTone: ['#FDDBB4', '#F1A97A', '#C68642', '#8D5524', '#4A2912'],

  hairStyle: {
    girl: ['long_straight', 'long_wavy', 'bun', 'ponytail', 'short_bob', 'space_buns', 'braid'],
    boy: ['short_side', 'short_curly', 'buzz', 'messy', 'slick', 'fade', 'mohawk'],
  },

  hairColor: [
    '#1a0a00',
    '#4B3621',
    '#8B5E3C',
    '#D4A04A',
    '#F5C5A3',
    '#C0392B',
    '#8E44AD',
    '#2980B9',
    '#E67E22',
    '#2ECC71',
  ],

  eyeStyle: ['normal', 'happy', 'wink', 'sleepy', 'surprised', 'starstruck'],

  eyeColor: ['#2c3e50', '#1a6b3c', '#6B4226', '#1e90ff', '#808080', '#FFD700'],

  mouthStyle: ['smile', 'big_smile', 'neutral', 'smirk', 'open', 'tongue'],

  glasses: ['none', 'round', 'square', 'cat_eye', 'sunglasses', 'heart_glasses'],

  accessories: ['none', 'earrings', 'necklace', 'bow', 'headband', 'cap', 'flower_crown', 'tie'],

  bgColor: [
    '#f5e6ff',
    '#e6f5ff',
    '#fff5e6',
    '#e6ffe6',
    '#ffe6e6',
    '#e6e6ff',
    '#fff0e6',
    '#f0f0f0',
    '#ffecf3',
    '#e8f8f5',
  ],
};

// ─── SVG Part Generators ─────────────────────────────────────────────────────

const getHairPath = (style, gender) => {
  const hairPaths = {
    // Girl styles
    long_straight: `
      <path d="M50,90 Q15,100 18,170 Q16,210 20,250 L26,250 Q22,210 26,170 Q27,115 52,100 Z" fill="HAIR"/>
      <path d="M150,90 Q185,100 182,170 Q184,210 180,250 L174,250 Q178,210 174,170 Q173,115 148,100 Z" fill="HAIR"/>
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
    `,
    long_wavy: `
      <path d="M50,90 Q12,105 18,140 Q8,165 22,185 Q10,210 20,235 Q12,255 22,250 L27,250 Q16,238 27,220 Q14,200 28,178 Q14,158 27,138 Q20,102 52,92 Z" fill="HAIR"/>
      <path d="M150,90 Q188,105 182,140 Q192,165 178,185 Q190,210 180,235 Q188,255 178,250 L173,250 Q184,238 173,220 Q186,200 172,178 Q186,158 173,138 Q180,102 148,92 Z" fill="HAIR"/>
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
    `,
    bun: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <ellipse cx="100" cy="6" rx="28" ry="24" fill="HAIR"/>
      <ellipse cx="100" cy="4" rx="14" ry="12" fill="HAIR_LIGHT"/>
      <path d="M85,20 Q100,10 115,18" stroke="HAIR_LIGHT" stroke-width="2" fill="none"/>
    `,
    ponytail: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <path d="M155,58 Q182,52 188,85 Q192,118 178,152 Q172,168 166,150 Q172,120 168,95 Q165,70 155,66 Z" fill="HAIR"/>
      <ellipse cx="170" cy="100" rx="10" ry="14" fill="HAIR_LIGHT"/>
    `,
    short_bob: `
      <path d="M35,78 Q40,22 100,18 Q160,22 165,78 Q172,108 158,120 Q135,132 100,132 Q65,132 42,120 Q28,108 35,78 Z" fill="HAIR"/>
      <path d="M42,120 Q38,130 40,138 Q44,135 50,128 Z" fill="HAIR"/>
      <path d="M158,120 Q162,130 160,138 Q156,135 150,128 Z" fill="HAIR"/>
    `,
    space_buns: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <circle cx="75" cy="5" r="18" fill="HAIR"/>
      <circle cx="125" cy="5" r="18" fill="HAIR"/>
      <circle cx="75" cy="3" r="8" fill="HAIR_LIGHT"/>
      <circle cx="125" cy="3" r="8" fill="HAIR_LIGHT"/>
    `,
    braid: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <path d="M85,40 Q80,80 78,130 Q76,170 80,210 Q78,230 82,250 L88,250 Q84,230 86,210 Q82,170 84,130 Q86,80 92,45 Z" fill="HAIR"/>
      <path d="M80,60 L86,58 M82,80 L88,78 M80,100 L86,98 M82,120 L88,118 M80,140 L86,138 M82,160 L88,158" stroke="HAIR_DARK" stroke-width="2" fill="none"/>
    `,
    // Boy styles
    short_side: `
      <path d="M35,78 Q40,22 100,18 Q160,22 165,78 Q165,58 156,46 Q132,32 100,30 Q68,32 44,46 Q35,58 35,78 Z" fill="HAIR"/>
      <path d="M35,78 Q32,62 38,52 Q35,68 42,80 Z" fill="HAIR"/>
      <line x1="42" y1="48" x2="45" y2="52" stroke="HAIR_LIGHT" stroke-width="1"/>
    `,
    short_curly: `
      <path d="M35,78 Q40,22 100,18 Q160,22 165,78 Q165,58 156,46 Q132,32 100,30 Q68,32 44,46 Q35,58 35,78 Z" fill="HAIR"/>
      <circle cx="50" cy="50" r="9" fill="HAIR"/>
      <circle cx="68" cy="38" r="10" fill="HAIR"/>
      <circle cx="88" cy="33" r="10" fill="HAIR"/>
      <circle cx="108" cy="33" r="10" fill="HAIR"/>
      <circle cx="128" cy="38" r="10" fill="HAIR"/>
      <circle cx="148" cy="50" r="9" fill="HAIR"/>
    `,
    buzz: `
      <path d="M35,78 Q42,28 100,24 Q158,28 165,78 Q165,56 155,44 Q132,32 100,30 Q68,32 45,44 Q35,56 35,78 Z" fill="HAIR"/>
      <path d="M45,44 Q48,36 52,40" stroke="HAIR_LIGHT" stroke-width="1" fill="none"/>
    `,
    messy: `
      <path d="M35,78 Q40,22 100,18 Q160,22 165,78 Q165,58 156,46 Q132,32 100,30 Q68,32 44,46 Q35,58 35,78 Z" fill="HAIR"/>
      <path d="M52,43 Q45,24 58,18 Q55,32 62,36 Z" fill="HAIR"/>
      <path d="M82,34 Q86,14 96,12 Q92,26 98,32 Z" fill="HAIR"/>
      <path d="M110,34 Q115,16 124,20 Q118,30 122,36 Z" fill="HAIR"/>
      <path d="M142,46 Q152,30 158,24 Q152,38 148,42 Z" fill="HAIR"/>
    `,
    slick: `
      <path d="M35,78 Q40,22 100,18 Q160,22 165,78 Q165,58 156,46 Q132,32 100,30 Q68,32 44,46 Q35,58 35,78 Z" fill="HAIR"/>
      <path d="M38,65 Q48,32 80,28 Q58,32 52,55 Z" fill="HAIR_LIGHT"/>
      <path d="M85,30 Q90,26 95,28" stroke="HAIR_DARK" stroke-width="1" fill="none"/>
    `,
    fade: `
      <path d="M35,78 Q42,28 100,24 Q158,28 165,78 Q165,56 155,44 Q132,32 100,30 Q68,32 45,44 Q35,56 35,78 Z" fill="HAIR"/>
      <rect x="35" y="72" width="130" height="8" opacity="0.3"/>
    `,
    mohawk: `
      <path d="M50,78 Q52,20 100,14 Q148,20 150,78 Q148,55 140,42 Q130,32 100,30 Q70,32 60,42 Q52,55 50,78 Z" fill="HAIR"/>
      <path d="M90,18 Q94,0 100,-4 Q106,0 110,18 Z" fill="HAIR"/>
    `,
  };
  return hairPaths[style] || hairPaths.short_side;
};

const getEyesSVG = (style, color) => {
  const eyes = {
    normal: `
      <ellipse cx="76" cy="108" rx="10" ry="11" fill="white"/>
      <circle cx="76" cy="110" r="7" fill="${color}"/>
      <circle cx="76" cy="110" r="3.5" fill="#111"/>
      <circle cx="79" cy="107" r="1.5" fill="white"/>
      <ellipse cx="124" cy="108" rx="10" ry="11" fill="white"/>
      <circle cx="124" cy="110" r="7" fill="${color}"/>
      <circle cx="124" cy="110" r="3.5" fill="#111"/>
      <circle cx="127" cy="107" r="1.5" fill="white"/>
    `,
    happy: `
      <path d="M66,108 Q76,98 86,108" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M114,108 Q124,98 134,108" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="76" cy="112" r="1" fill="#333"/>
      <circle cx="124" cy="112" r="1" fill="#333"/>
    `,
    wink: `
      <ellipse cx="76" cy="106" rx="10" ry="11" fill="white"/>
      <circle cx="76" cy="108" r="7" fill="${color}"/>
      <circle cx="76" cy="108" r="3.5" fill="#111"/>
      <circle cx="79" cy="105" r="1.5" fill="white"/>
      <path d="M114,108 Q124,98 134,108" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `,
    sleepy: `
      <path d="M66,106 Q76,114 86,106" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M114,106 Q124,114 134,106" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="76" cy="110" r="1" fill="#555"/>
      <circle cx="124" cy="110" r="1" fill="#555"/>
    `,
    surprised: `
      <ellipse cx="76" cy="108" rx="12" ry="14" fill="white"/>
      <circle cx="76" cy="110" r="8" fill="${color}"/>
      <circle cx="76" cy="110" r="4" fill="#111"/>
      <circle cx="79" cy="107" r="2" fill="white"/>
      <ellipse cx="124" cy="108" rx="12" ry="14" fill="white"/>
      <circle cx="124" cy="110" r="8" fill="${color}"/>
      <circle cx="124" cy="110" r="4" fill="#111"/>
      <circle cx="127" cy="107" r="2" fill="white"/>
    `,
    starstruck: `
      <ellipse cx="74" cy="107" rx="10" ry="11" fill="white"/>
      <circle cx="74" cy="109" r="7" fill="${color}"/>
      <circle cx="74" cy="109" r="3.5" fill="#111"/>
      <text x="66" y="104" font-size="8" fill="#FFD700">★</text>
      <ellipse cx="126" cy="107" rx="10" ry="11" fill="white"/>
      <circle cx="126" cy="109" r="7" fill="${color}"/>
      <circle cx="126" cy="109" r="3.5" fill="#111"/>
      <text x="118" y="104" font-size="8" fill="#FFD700">★</text>
    `,
  };
  return eyes[style] || eyes.normal;
};

const getMouthSVG = style => {
  const mouths = {
    smile: `
      <path d="M82,138 Q100,154 118,138" stroke="#c0605a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="78" cy="134" r="1.5" fill="#c0605a" opacity="0.5"/>
      <circle cx="122" cy="134" r="1.5" fill="#c0605a" opacity="0.5"/>
    `,
    big_smile: `
      <path d="M76,136 Q100,162 124,136" stroke="#c0605a" stroke-width="2.5" fill="#e8a09d" stroke-linecap="round"/>
      <path d="M82,138 Q100,152 118,136" fill="#c0605a"/>
    `,
    neutral: `
      <line x1="86" y1="142" x2="114" y2="142" stroke="#c0605a" stroke-width="2.5" stroke-linecap="round"/>
    `,
    smirk: `
      <path d="M86,142 Q104,136 116,132" stroke="#c0605a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M76,140 Q80,138 84,140" stroke="#c0605a" stroke-width="1.5" fill="none"/>
    `,
    open: `
      <ellipse cx="100" cy="142" rx="14" ry="10" fill="#c0605a"/>
      <ellipse cx="100" cy="144" rx="10" ry="7" fill="#8b3a3a"/>
    `,
    tongue: `
      <ellipse cx="100" cy="142" rx="12" ry="9" fill="#c0605a"/>
      <ellipse cx="100" cy="146" rx="7" ry="5" fill="#e8a09d"/>
    `,
  };
  return mouths[style] || mouths.smile;
};

const getGlassesSVG = style => {
  const glasses = {
    none: '',
    round: `
      <circle cx="76" cy="108" r="16" fill="none" stroke="#555" stroke-width="2.5"/>
      <circle cx="124" cy="108" r="16" fill="none" stroke="#555" stroke-width="2.5"/>
      <line x1="92" y1="108" x2="108" y2="108" stroke="#555" stroke-width="2"/>
      <line x1="42" y1="104" x2="60" y2="104" stroke="#555" stroke-width="2"/>
      <line x1="140" y1="104" x2="158" y2="104" stroke="#555" stroke-width="2"/>
    `,
    square: `
      <rect x="60" y="94" width="32" height="24" rx="4" fill="none" stroke="#555" stroke-width="2.5"/>
      <rect x="108" y="94" width="32" height="24" rx="4" fill="none" stroke="#555" stroke-width="2.5"/>
      <line x1="92" y1="106" x2="108" y2="106" stroke="#555" stroke-width="2"/>
      <line x1="42" y1="102" x2="60" y2="102" stroke="#555" stroke-width="2"/>
      <line x1="140" y1="102" x2="158" y2="102" stroke="#555" stroke-width="2"/>
    `,
    cat_eye: `
      <path d="M56,112 Q68,92 92,96 Q96,118 76,118 Z" fill="none" stroke="#c0392b" stroke-width="2.5"/>
      <path d="M108,112 Q120,92 144,96 Q148,118 124,118 Z" fill="none" stroke="#c0392b" stroke-width="2.5"/>
      <line x1="92" y1="107" x2="108" y2="107" stroke="#c0392b" stroke-width="2"/>
      <line x1="40" y1="103" x2="56" y2="107" stroke="#c0392b" stroke-width="2"/>
      <line x1="144" y1="107" x2="160" y2="103" stroke="#c0392b" stroke-width="2"/>
    `,
    sunglasses: `
      <rect x="58" y="96" width="40" height="22" rx="10" fill="rgba(30,30,30,0.88)"/>
      <rect x="102" y="96" width="40" height="22" rx="10" fill="rgba(30,30,30,0.88)"/>
      <line x1="98" y1="107" x2="102" y2="107" stroke="#444" stroke-width="2"/>
      <line x1="42" y1="104" x2="58" y2="106" stroke="#444" stroke-width="2"/>
      <line x1="142" y1="106" x2="158" y2="104" stroke="#444" stroke-width="2"/>
      <rect x="62" y="100" width="32" height="14" rx="5" fill="rgba(0,0,0,0.3)"/>
      <rect x="106" y="100" width="32" height="14" rx="5" fill="rgba(0,0,0,0.3)"/>
    `,
    heart_glasses: `
      <path d="M60,106 L70,96 L80,106 L70,116 Z" fill="none" stroke="#e84393" stroke-width="2" stroke-linejoin="round"/>
      <path d="M120,106 L130,96 L140,106 L130,116 Z" fill="none" stroke="#e84393" stroke-width="2" stroke-linejoin="round"/>
      <line x1="80" y1="106" x2="120" y2="106" stroke="#e84393" stroke-width="2"/>
      <line x1="42" y1="103" x2="60" y2="105" stroke="#e84393" stroke-width="2"/>
      <line x1="140" y1="105" x2="158" y2="103" stroke="#e84393" stroke-width="2"/>
    `,
  };
  return glasses[style] || '';
};

const getAccessorySVG = (style, gender) => {
  const accessories = {
    none: '',
    earrings: `
      <circle cx="38" cy="122" r="4.5" fill="#FFD700"/>
      <circle cx="162" cy="122" r="4.5" fill="#FFD700"/>
      <circle cx="38" cy="133" r="3" fill="#FFD700"/>
      <circle cx="162" cy="133" r="3" fill="#FFD700"/>
      <circle cx="38" cy="128" r="1.5" fill="#FFF"/>
      <circle cx="162" cy="128" r="1.5" fill="#FFF"/>
    `,
    necklace: `
      <path d="M65,180 Q100,198 135,180" stroke="#FFD700" stroke-width="2.5" fill="none"/>
      <circle cx="100" cy="198" r="6" fill="#FFD700"/>
      <circle cx="100" cy="196" r="3" fill="#fff"/>
      <path d="M68,178 Q70,182 72,178" stroke="#FFD700" stroke-width="1.5" fill="none"/>
    `,
    bow: `
      <path d="M80,60 Q90,52 100,58 Q110,52 120,60 Q110,68 100,64 Q90,68 80,60 Z" fill="#FF6B9D"/>
      <circle cx="100" cy="61" r="5.5" fill="#FF3D7F"/>
      <path d="M78,56 L82,64 M122,56 L118,64" stroke="#FF6B9D" stroke-width="2" fill="none"/>
    `,
    headband: `
      <path d="M38,76 Q100,56 162,76" stroke="#9B59B6" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M38,76 Q100,56 162,76" stroke="#C39BD3" stroke-width="4" fill="none" stroke-linecap="round"/>
    `,
    cap: `
      <path d="M30,78 Q100,36 170,78 Q162,70 152,64 Q130,52 100,48 Q70,52 48,64 Q38,70 30,78 Z" fill="#3498DB"/>
      <rect x="20" y="74" width="38" height="8" rx="4" fill="#2980B9"/>
      <path d="M80,48 Q100,42 120,48" stroke="#2980B9" stroke-width="2" fill="none"/>
    `,
    flower_crown: `
      <circle cx="70" cy="58" r="8" fill="#FF69B4"/>
      <circle cx="90" cy="52" r="9" fill="#FFB6C1"/>
      <circle cx="110" cy="52" r="9" fill="#FF69B4"/>
      <circle cx="130" cy="58" r="8" fill="#FFB6C1"/>
      <circle cx="80" cy="55" r="4" fill="#FFD700"/>
      <circle cx="100" cy="50" r="4" fill="#FFD700"/>
      <circle cx="120" cy="55" r="4" fill="#FFD700"/>
    `,
    tie: `
      <path d="M90,178 L100,210 L110,178 Z" fill="#2c3e50"/>
      <path d="M88,172 L112,172 L110,178 L90,178 Z" fill="#34495e"/>
      <circle cx="100" cy="186" r="3" fill="#ECF0F1"/>
    `,
  };
  return accessories[style] || '';
};

// ─── Main SVG Builder ────────────────────────────────────────────────────────

const buildAvatarSVG = config => {
  const {
    gender,
    skinTone,
    hairStyle,
    hairColor,
    eyeStyle,
    eyeColor,
    mouthStyle,
    glasses,
    accessories,
    bgColor,
  } = config;

  const hairDark = darkenHex(hairColor, 30);
  const hairLight = lightenHex(hairColor, 40);

  let hairSVG = getHairPath(hairStyle, gender)
    .replace(/fill="HAIR_LIGHT"/g, `fill="${hairLight}"`)
    .replace(/fill="HAIR_DARK"/g, `fill="${hairDark}"`)
    .replace(/fill="HAIR"/g, `fill="${hairColor}"`);

  return `
<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <circle cx="100" cy="140" r="100" fill="${bgColor}"/>

  <!-- Neck -->
  <rect x="88" y="168" width="24" height="32" rx="8" fill="${skinTone}"/>
  <rect x="86" y="196" width="28" height="8" rx="3" fill="${darkenHex(skinTone, 10)}" opacity="0.3"/>

  <!-- Shoulders / Body -->
  ${gender === 'girl'
    ? '<path d="M28,250 Q48,192 100,186 Q152,192 172,250 Q148,262 100,265 Q52,262 28,250 Z" fill="#E91E8C"/>'
    : '<path d="M26,250 Q46,190 100,184 Q154,190 174,250 Q148,264 100,266 Q52,264 26,250 Z" fill="#3498DB"/>'}

  <!-- Body detail - collar -->
  <path d="M80,210 Q100,225 120,210" stroke="rgba(0,0,0,0.1)" stroke-width="2" fill="none"/>

  <!-- Head -->
  <ellipse cx="100" cy="115" rx="66" ry="72" fill="${skinTone}"/>

  <!-- Head shadow for depth -->
  <ellipse cx="100" cy="115" rx="66" ry="72" fill="none" stroke="${darkenHex(skinTone, 15)}" stroke-width="1" opacity="0.3"/>

  <!-- Hair (back layer) -->
  ${hairSVG}

  <!-- Ears -->
  <ellipse cx="35" cy="118" rx="9" ry="12" fill="${skinTone}"/>
  <ellipse cx="165" cy="118" rx="9" ry="12" fill="${skinTone}"/>
  <ellipse cx="35" cy="118" rx="5" ry="7" fill="${darkenHex(skinTone, 15)}"/>
  <ellipse cx="165" cy="118" rx="5" ry="7" fill="${darkenHex(skinTone, 15)}"/>

  <!-- Eyebrows -->
  <path d="M62,95 Q76,86 90,93" stroke="${hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M110,93 Q124,86 138,95" stroke="${hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- Eyes -->
  ${getEyesSVG(eyeStyle, eyeColor)}

  <!-- Nose -->
  <path d="M97,118 Q95,132 100,136 Q105,132 103,118" stroke="${darkenHex(skinTone, 25)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- Cheek blush -->
  <ellipse cx="62" cy="128" rx="12" ry="7" fill="rgba(255,150,150,0.35)"/>
  <ellipse cx="138" cy="128" rx="12" ry="7" fill="rgba(255,150,150,0.35)"/>

  <!-- Mouth -->
  ${getMouthSVG(mouthStyle)}

  <!-- Freckles (optional subtle detail) -->
  <circle cx="70" cy="122" r="1" fill="${darkenHex(skinTone, 25)}" opacity="0.4"/>
  <circle cx="76" cy="125" r="1" fill="${darkenHex(skinTone, 25)}" opacity="0.4"/>
  <circle cx="124" cy="125" r="1" fill="${darkenHex(skinTone, 25)}" opacity="0.4"/>
  <circle cx="130" cy="122" r="1" fill="${darkenHex(skinTone, 25)}" opacity="0.4"/>

  <!-- Hair (front layer - for bangs/front hair) -->
  <g id="front-hair">
    ${hairStyle === 'short_bob' ? `
      <path d="M35,78 Q40,22 100,18 Q160,22 165,78 Q168,95 160,100 Q150,108 140,105 Q130,100 125,95 Q120,88 110,90 Q100,92 90,90 Q80,88 75,95 Q70,100 60,105 Q50,108 40,100 Q32,95 35,78 Z" fill="${hairColor}" opacity="0.6"/>
    ` : ''}
    ${hairStyle === 'messy' ? `
      <path d="M50,60 Q45,45 55,38 Q52,48 58,55 Z" fill="${hairColor}"/>
      <path d="M140,60 Q145,45 145,38 Q148,48 142,55 Z" fill="${hairColor}"/>
    ` : ''}
  </g>

  <!-- Glasses -->
  ${getGlassesSVG(glasses)}

  <!-- Accessories -->
  ${getAccessorySVG(accessories, gender)}
</svg>
  `.trim();
};

// ─── Color Helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function lightenHex(hex, amount = 30) {
  const {r, g, b} = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darkenHex(hex, amount = 30) {
  const {r, g, b} = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}

// ─── Option Renderer Helpers ─────────────────────────────────────────────────

const ColorSwatch = ({color, selected, onPress}) => (
  <TouchableOpacity
    style={[
      styles.swatch,
      {backgroundColor: color},
      selected && styles.swatchSelected,
    ]}
    onPress={() => onPress(color)}
    activeOpacity={0.8}
  />
);

const formatOptionLabel = value =>
  value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const OptionChip = ({label, selected, onPress}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.8}>
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {formatOptionLabel(label)}
    </Text>
  </TouchableOpacity>
);

// ─── AvatarBuilder Component ─────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  gender: 'girl',
  skinTone: '#FDDBB4',
  hairStyle: 'long_straight',
  hairColor: '#4B3621',
  eyeStyle: 'normal',
  eyeColor: '#2c3e50',
  mouthStyle: 'smile',
  glasses: 'none',
  accessories: 'none',
  bgColor: '#f5e6ff',
};

const SECTIONS = [
  {key: 'gender', label: 'Gender', type: 'chip', icon: '👤'},
  {key: 'skinTone', label: 'Skin Tone', type: 'color', icon: '🎨'},
  {key: 'hairStyle', label: 'Hair Style', type: 'chip_dynamic', icon: '💇'},
  {key: 'hairColor', label: 'Hair Color', type: 'color', icon: '🎨'},
  {key: 'eyeStyle', label: 'Eyes', type: 'chip', icon: '👁️'},
  {key: 'eyeColor', label: 'Eye Color', type: 'color', icon: '🎨'},
  {key: 'mouthStyle', label: 'Mouth', type: 'chip', icon: '😊'},
  {key: 'glasses', label: 'Glasses', type: 'chip', icon: '👓'},
  {key: 'accessories', label: 'Accessories', type: 'chip', icon: '💎'},
  {key: 'bgColor', label: 'Background', type: 'color', icon: '🖼️'},
];

const AvatarBuilder = ({visible, onClose, onSave}) => {
  const [config, setConfig] = useState({...DEFAULT_CONFIG});
  const [activeSection, setActiveSection] = useState(null);

  const update = useCallback((key, value) => {
    setConfig(prev => {
      const next = {...prev, [key]: value};
      // Reset hair style when gender changes
      if (key === 'gender') {
        next.hairStyle = AVATAR_OPTIONS.hairStyle[value][0];
        next.accessories = 'none';
      }
      return next;
    });
  }, []);

  const avatarSVG = buildAvatarSVG(config);

  const randomizeAvatar = useCallback(() => {
    const g = Math.random() > 0.5 ? 'girl' : 'boy';
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    setConfig({
      gender: g,
      skinTone: pick(AVATAR_OPTIONS.skinTone),
      hairStyle: pick(AVATAR_OPTIONS.hairStyle[g]),
      hairColor: pick(AVATAR_OPTIONS.hairColor),
      eyeStyle: pick(AVATAR_OPTIONS.eyeStyle),
      eyeColor: pick(AVATAR_OPTIONS.eyeColor),
      mouthStyle: pick(AVATAR_OPTIONS.mouthStyle),
      glasses: pick(AVATAR_OPTIONS.glasses),
      accessories: pick(AVATAR_OPTIONS.accessories),
      bgColor: pick(AVATAR_OPTIONS.bgColor),
    });
  }, []);

  const renderSection = section => {
    const {key, label, type, icon} = section;
    const isActive = activeSection === key;
    const currentValue = config[key];

    if (type === 'color') {
      const colors = AVATAR_OPTIONS[key];
      return (
        <View key={key} style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setActiveSection(isActive ? null : key)}
            activeOpacity={0.7}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionIcon}>{icon}</Text>
              <Text style={styles.sectionLabel}>{label}</Text>
            </View>
            <View style={styles.currentValuePreview}>
              {colors.slice(0, 3).map(c => (
                <View key={c} style={[styles.previewDot, {backgroundColor: c}]} />
              ))}
              <Text style={styles.sectionChevron}>{isActive ? '▲' : '▼'}</Text>
            </View>
          </TouchableOpacity>
          
          {isActive && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchScroll}>
              <View style={styles.swatchRow}>
                {colors.map(color => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    selected={config[key] === color}
                    onPress={v => update(key, v)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    if (type === 'chip' || type === 'chip_dynamic') {
      const options = type === 'chip_dynamic'
        ? AVATAR_OPTIONS[key][config.gender]
        : AVATAR_OPTIONS[key];

      return (
        <View key={key} style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setActiveSection(isActive ? null : key)}
            activeOpacity={0.7}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionIcon}>{icon}</Text>
              <Text style={styles.sectionLabel}>{label}</Text>
            </View>
            <View style={styles.currentValuePreview}>
              <Text style={styles.currentValueText}>
                {formatOptionLabel(currentValue)}
              </Text>
              <Text style={styles.sectionChevron}>{isActive ? '▲' : '▼'}</Text>
            </View>
          </TouchableOpacity>
          
          {isActive && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                {options.map(opt => (
                  <OptionChip
                    key={opt}
                    label={opt}
                    selected={config[key] === opt}
                    onPress={() => update(key, opt)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>Close</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Customize Avatar</Text>
          
          <TouchableOpacity
            onPress={() => onSave && onSave(config)}
            style={[styles.headerBtn, styles.saveBtn]}
            activeOpacity={0.8}>
            <Text style={[styles.headerBtnText, styles.saveBtnText]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Avatar Preview */}
          <View style={styles.previewSection}>
            <View style={[styles.previewContainer, {backgroundColor: config.bgColor}]}>
              <SvgXml xml={avatarSVG} width={200} height={200} />
            </View>
            
            {/* Randomize Button */}
            <TouchableOpacity
              style={styles.randomBtn}
              onPress={randomizeAvatar}
              activeOpacity={0.8}>
              <Text style={styles.randomBtnText}>🎲 Randomize Avatar</Text>
            </TouchableOpacity>
          </View>

          {/* Option Sections */}
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>Customize Features</Text>
            {SECTIONS.map(renderSection)}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── AvatarDisplay (small widget shown in app) ───────────────────────────────

export const AvatarDisplay = ({config, size = 60, onPress}) => {
  const svg = config ? buildAvatarSVG(config) : buildAvatarSVG(DEFAULT_CONFIG);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.avatarDisplay,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config?.bgColor || '#f5e6ff',
        },
      ]}
      activeOpacity={0.85}>
      <SvgXml xml={svg} width={size * 0.9} height={size * 0.9} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerBtn: {
    minWidth: 68,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  saveBtn: {
    backgroundColor: '#6c5ce7',
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  saveBtnText: {
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  randomBtn: {
    marginTop: 20,
    backgroundColor: '#6c5ce7',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 28,
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  randomBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  optionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  section: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3436',
  },
  currentValuePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentValueText: {
    fontSize: 13,
    color: '#6c5ce7',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  previewDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#eee',
  },
  sectionChevron: {
    fontSize: 12,
    color: '#bbb',
    marginLeft: 8,
  },
  swatchScroll: {
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingVertical: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  swatchSelected: {
    borderColor: '#6c5ce7',
    transform: [{scale: 1.05}],
    elevation: 4,
  },
  chipScroll: {
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingVertical: 12,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
  },
  chipSelected: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#fff',
  },
  avatarDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#6c5ce7',
    elevation: 4,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});

export default AvatarBuilder;