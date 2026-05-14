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

  skinTone: ['#FFE4C9', '#FDD9B5', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#5C3317', '#3B2219', '#FDEBE0', '#D4A574'],

  hairStyle: {
    girl: ['long_straight', 'long_wavy', 'bun', 'ponytail', 'short_bob', 'space_buns', 'braid'],
    boy: ['short_side', 'short_curly', 'buzz', 'messy', 'slick', 'fade', 'mohawk'],
    girl: ['long_straight', 'long_wavy', 'bun', 'ponytail', 'short_bob', 'space_buns', 'braid', 'shag', 'pixie', 'box_braids'],
    boy: ['short_side', 'short_curly', 'buzz', 'messy', 'slick', 'fade', 'mohawk', 'undercut', 'man_bun', 'top_knot'],
  },

  hairColor: [
    '#090806',
    '#2C222B',
    '#3B3024',
    '#5A3825',
    '#8B4513',
    '#B55239',
    '#D6C4C2',
    '#E5C8A8',
    '#DEBC99',
    '#B89778',
    '#A55728',
    '#B89778',
    '#C31331',
    '#9C2542',
    '#8B3A62',
    '#6B4E71',
    '#4169E1',
    '#20B2AA',
    '#FF6B9D',
    '#FFD700',
    '#7B68EE',
    '#00CED1',
  ],

  facialHair: ['none', 'stubble', 'beard', 'goatee', 'mustache'],

  eyeStyle: ['normal', 'happy', 'wink', 'sleepy', 'surprised', 'starstruck'],

  eyeColor: ['#2c3e50', '#1a6b3c', '#6B4226', '#1e90ff', '#808080', '#FFD700'],

  mouthStyle: ['smile', 'big_smile', 'neutral', 'smirk', 'open', 'tongue'],

  glasses: ['none', 'round', 'square', 'cat_eye', 'sunglasses', 'heart_glasses'],

  accessories: ['none', 'earrings', 'necklace', 'bow', 'headband', 'cap', 'flower_crown', 'tie'],
  accessories: ['none', 'earrings', 'necklace', 'bow', 'headband', 'cap', 'flower_crown', 'tie', 'headphones', 'beanie', 'hijab'],

  clothingColor: [
    '#FF6B9D', '#FF8E72', '#FFC75F', '#9EE493', '#45B7D1', '#845EC2',
    '#D65DB1', '#2C73D2', '#0089BA', '#008E9B', '#008F7A', '#00C9A7',
    '#4D8076', '#4B4453', '#2C3E50', '#34495E', '#757575', '#1A1A2E',
    '#F5F6FA', '#FFFFFF', '#F9F871', '#FF9671', '#FFC75F', '#C34A36',
  ],

  bgColor: [
    '#FFE8F6', '#FFF0E8', '#FFFDE8', '#E8FFF3', '#E8F4FF', '#F0E8FF',
    '#FFE8E8', '#E8FFFF', '#FFF8E8', '#F8E8FF', '#F5F5F5', '#E8E8F5',
    '#FFD6E8', '#FFEBD6', '#D6FFEB', '#D6EBFF', '#EBD6FF', '#EBFFD6',
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
    shag: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <path d="M42,85 Q30,95 32,130 Q34,160 25,180 L35,180 Q40,150 42,120 Z" fill="HAIR"/>
      <path d="M158,85 Q170,95 168,130 Q166,160 175,180 L165,180 Q160,150 158,120 Z" fill="HAIR"/>
    `,
    pixie: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <path d="M40,78 Q45,60 55,55 Q50,70 48,82 Z" fill="HAIR"/>
      <path d="M160,78 Q155,60 145,55 Q150,70 152,82 Z" fill="HAIR"/>
    `,
    box_braids: `
      <path d="M38,75 Q48,22 100,18 Q152,22 162,75 Q167,52 158,38 Q138,0 100,-2 Q62,0 42,38 Q33,52 38,75 Z" fill="HAIR"/>
      <path d="M45,90 L40,250 M55,95 L50,250 M65,98 L60,250 M135,98 L140,250 M145,95 L150,250 M155,90 L160,250" stroke="HAIR" stroke-width="6" stroke-linecap="round"/>
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
    undercut: `
      <path d="M50,78 Q52,20 100,14 Q148,20 150,78 Q148,55 140,42 Q130,32 100,30 Q70,32 60,42 Q52,55 50,78 Z" fill="HAIR"/>
      <rect x="50" y="60" width="100" height="20" fill="HAIR" opacity="0.3"/>
    `,
    man_bun: `
      <path d="M35,78 Q42,28 100,24 Q158,28 165,78 Q165,56 155,44 Q132,32 100,30 Q68,32 45,44 Q35,56 35,78 Z" fill="HAIR"/>
      <circle cx="100" cy="20" r="14" fill="HAIR"/>
      <path d="M90,30 Q100,25 110,30" stroke="HAIR_LIGHT" stroke-width="1.5" fill="none"/>
    `,
    top_knot: `
      <path d="M50,78 Q52,20 100,14 Q148,20 150,78 Q148,55 140,42 Q130,32 100,30 Q70,32 60,42 Q52,55 50,78 Z" fill="HAIR"/>
      <circle cx="100" cy="8" r="12" fill="HAIR"/>
    `,
  };
  return hairPaths[style] || hairPaths.short_side;
};

const getEyesSVG = (style, color) => {
  const eyes = {
    normal: `
      <ellipse cx="76" cy="108" rx="12" ry="13" fill="white"/>
      <ellipse cx="76" cy="109" rx="8" ry="9" fill="${color}"/>
      <circle cx="76" cy="109" r="4" fill="#111"/>
      <circle cx="79" cy="106" r="2" fill="white"/>
      <ellipse cx="74" cy="103" rx="4" ry="2" fill="rgba(255,255,255,0.4)"/>
      <ellipse cx="124" cy="108" rx="12" ry="13" fill="white"/>
      <ellipse cx="124" cy="109" rx="8" ry="9" fill="${color}"/>
      <circle cx="124" cy="109" r="4" fill="#111"/>
      <circle cx="127" cy="106" r="2" fill="white"/>
      <ellipse cx="122" cy="103" rx="4" ry="2" fill="rgba(255,255,255,0.4)"/>
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
      <ellipse cx="76" cy="106" rx="14" ry="16" fill="white"/>
      <ellipse cx="76" cy="107" rx="10" ry="11" fill="${color}"/>
      <circle cx="76" cy="107" r="5" fill="#111"/>
      <circle cx="80" cy="103" r="2.5" fill="white"/>
      <ellipse cx="73" cy="100" rx="5" ry="3" fill="rgba(255,255,255,0.5)"/>
      <ellipse cx="124" cy="106" rx="14" ry="16" fill="white"/>
      <ellipse cx="124" cy="107" rx="10" ry="11" fill="${color}"/>
      <circle cx="124" cy="107" r="5" fill="#111"/>
      <circle cx="128" cy="103" r="2.5" fill="white"/>
      <ellipse cx="121" cy="100" rx="5" ry="3" fill="rgba(255,255,255,0.5)"/>
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
      <path d="M84,140 Q100,156 116,140" stroke="#E57373" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M88,142 Q100,152 112,140" fill="#FFCDD2" opacity="0.6"/>
      <circle cx="80" cy="136" r="2" fill="#FFCDD2" opacity="0.7"/>
      <circle cx="120" cy="136" r="2" fill="#FFCDD2" opacity="0.7"/>
    `,
    big_smile: `
      <path d="M78,138 Q100,166 122,138" stroke="#E57373" stroke-width="3" fill="#FFEBEE" stroke-linecap="round"/>
      <path d="M84,142 Q100,158 116,138" fill="#EF9A9A"/>
      <path d="M88,145 Q100,155 112,145" stroke="#F8BBD9" stroke-width="2" fill="none" opacity="0.5"/>
    `,
    neutral: `
      <line x1="86" y1="142" x2="114" y2="142" stroke="#c0605a" stroke-width="2.5" stroke-linecap="round"/>
    `,
    smirk: `
      <path d="M86,142 Q104,136 116,132" stroke="#c0605a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M76,140 Q80,138 84,140" stroke="#c0605a" stroke-width="1.5" fill="none"/>
    `,
    open: `
      <ellipse cx="100" cy="142" rx="14" ry="11" fill="#E57373"/>
      <ellipse cx="100" cy="144" rx="11" ry="8" fill="#C62828"/>
      <ellipse cx="100" cy="142" rx="8" ry="5" fill="#D32F2F" opacity="0.5"/>
      <ellipse cx="100" cy="139" rx="6" ry="3" fill="white" opacity="0.3"/>
    `,
    tongue: `
      <ellipse cx="100" cy="142" rx="13" ry="10" fill="#E57373"/>
      <ellipse cx="100" cy="148" rx="8" ry="7" fill="#F8BBD9"/>
      <ellipse cx="100" cy="146" rx="6" ry="5" fill="#F48FB1"/>
      <line x1="100" y1="142" x2="100" y2="150" stroke="#E91E63" stroke-width="1.5" opacity="0.4"/>
    `,
  };
  return mouths[style] || mouths.smile;
};

const getFacialHairSVG = (style, color) => {
  const styles = {
    none: '',
    stubble: `
      <path d="M70,145 Q100,165 130,145" stroke="${color}" stroke-width="10" stroke-dasharray="1 3" opacity="0.3" fill="none"/>
    `,
    beard: `
      <path d="M60,135 Q100,185 140,135 Q145,150 140,165 Q100,205 60,165 Q55,150 60,135 Z" fill="${color}"/>
    `,
    goatee: `
      <path d="M90,148 Q100,175 110,148 Q110,160 105,168 Q100,172 95,168 Q90,160 90,148 Z" fill="${color}"/>
    `,
    mustache: `
      <path d="M80,142 Q90,138 100,142 Q110,138 120,142 Q115,148 100,146 Q85,148 80,142 Z" fill="${color}"/>
    `,
  };
  return styles[style] || '';
};

const getGlassesSVG = style => {
  const glasses = {
    none: '',
    round: `
      <circle cx="76" cy="108" r="18" fill="none" stroke="#333" stroke-width="2.5"/>
      <circle cx="76" cy="108" r="16" fill="rgba(200,220,255,0.15)"/>
      <circle cx="124" cy="108" r="18" fill="none" stroke="#333" stroke-width="2.5"/>
      <circle cx="124" cy="108" r="16" fill="rgba(200,220,255,0.15)"/>
      <line x1="94" y1="108" x2="106" y2="108" stroke="#333" stroke-width="2"/>
      <line x1="40" y1="104" x2="58" y2="106" stroke="#333" stroke-width="2"/>
      <line x1="142" y1="106" x2="160" y2="104" stroke="#333" stroke-width="2"/>
    `,
    square: `
      <rect x="56" y="92" width="36" height="28" rx="6" fill="rgba(200,220,255,0.15)"/>
      <rect x="56" y="92" width="36" height="28" rx="6" fill="none" stroke="#333" stroke-width="2.5"/>
      <rect x="108" y="92" width="36" height="28" rx="6" fill="rgba(200,220,255,0.15)"/>
      <rect x="108" y="92" width="36" height="28" rx="6" fill="none" stroke="#333" stroke-width="2.5"/>
      <line x1="92" y1="106" x2="108" y2="106" stroke="#333" stroke-width="2"/>
      <line x1="40" y1="102" x2="56" y2="102" stroke="#333" stroke-width="2"/>
      <line x1="144" y1="102" x2="160" y2="102" stroke="#333" stroke-width="2"/>
    `,
    cat_eye: `
      <path d="M56,112 Q68,92 92,96 Q96,118 76,118 Z" fill="none" stroke="#c0392b" stroke-width="2.5"/>
      <path d="M108,112 Q120,92 144,96 Q148,118 124,118 Z" fill="none" stroke="#c0392b" stroke-width="2.5"/>
      <line x1="92" y1="107" x2="108" y2="107" stroke="#c0392b" stroke-width="2"/>
      <line x1="40" y1="103" x2="56" y2="107" stroke="#c0392b" stroke-width="2"/>
      <line x1="144" y1="107" x2="160" y2="103" stroke="#c0392b" stroke-width="2"/>
    `,
    sunglasses: `
      <rect x="54" y="94" width="44" height="26" rx="12" fill="rgba(20,20,30,0.92)"/>
      <rect x="58" y="98" width="36" height="18" rx="8" fill="rgba(80,80,100,0.4)"/>
      <rect x="102" y="94" width="44" height="26" rx="12" fill="rgba(20,20,30,0.92)"/>
      <rect x="106" y="98" width="36" height="18" rx="8" fill="rgba(80,80,100,0.4)"/>
      <line x1="98" y1="107" x2="102" y2="107" stroke="#333" stroke-width="3"/>
      <line x1="40" y1="104" x2="54" y2="106" stroke="#333" stroke-width="2.5"/>
      <line x1="146" y1="106" x2="160" y2="104" stroke="#333" stroke-width="2.5"/>
    `,
    heart_glasses: `
      <path d="M60,108 Q60,90 76,92 Q88,94 88,108 Q88,120 74,122 Q60,120 60,108 Z" fill="rgba(236,72,153,0.3)" stroke="#EC4899" stroke-width="2"/>
      <path d="M112,108 Q112,90 128,92 Q140,94 140,108 Q140,120 126,122 Q112,120 112,108 Z" fill="rgba(236,72,153,0.3)" stroke="#EC4899" stroke-width="2"/>
      <circle cx="70" cy="105" r="3" fill="rgba(255,255,255,0.5)"/>
      <circle cx="122" cy="105" r="3" fill="rgba(255,255,255,0.5)"/>
      <line x1="88" y1="107" x2="112" y2="107" stroke="#EC4899" stroke-width="2"/>
      <line x1="40" y1="103" x2="60" y2="106" stroke="#EC4899" stroke-width="2"/>
      <line x1="140" y1="106" x2="160" y2="103" stroke="#EC4899" stroke-width="2"/>
    `,
  };
  return glasses[style] || '';
};

const getAccessorySVG = (style, gender) => {
  const accessories = {
    none: '',
    earrings: `
      <circle cx="38" cy="120" r="5" fill="#FFD700"/>
      <circle cx="38" cy="120" r="3" fill="#FFF8DC"/>
      <circle cx="38" cy="132" r="4" fill="#FFD700"/>
      <circle cx="38" cy="132" r="2" fill="#FFF8DC"/>
      <circle cx="162" cy="120" r="5" fill="#FFD700"/>
      <circle cx="162" cy="120" r="3" fill="#FFF8DC"/>
      <circle cx="162" cy="132" r="4" fill="#FFD700"/>
      <circle cx="162" cy="132" r="2" fill="#FFF8DC"/>
    `,
    necklace: `
      <path d="M62,182 Q100,205 138,182" stroke="#FFD700" stroke-width="3" fill="none"/>
      <circle cx="100" cy="206" r="8" fill="#FFD700"/>
      <circle cx="100" cy="206" r="5" fill="#FFF8DC"/>
      <circle cx="100" cy="206" r="3" fill="#FFD700"/>
    `,
    bow: `
      <path d="M75,56 Q88,44 100,52 Q112,44 125,56 Q112,68 100,62 Q88,68 75,56 Z" fill="#FF6B9D"/>
      <circle cx="100" cy="58" r="6" fill="#FF3D7F"/>
      <path d="M88,52 Q85,48 88,44" stroke="#FF6B9D" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M112,52 Q115,48 112,44" stroke="#FF6B9D" stroke-width="3" fill="none" stroke-linecap="round"/>
    `,
    headband: `
      <path d="M38,72 Q100,48 162,72" stroke="#9B59B6" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M38,72 Q100,48 162,72" stroke="#BB8FCE" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="60" cy="60" r="6" fill="#E8DAEF"/>
      <circle cx="140" cy="60" r="6" fill="#E8DAEF"/>
    `,
    cap: `
      <path d="M28,76 Q100,28 172,76 Q162,66 150,60 Q125,44 100,40 Q75,44 50,60 Q38,66 28,76 Z" fill="#3498DB"/>
      <rect x="18" y="70" width="48" height="10" rx="5" fill="#2980B9"/>
      <path d="M78,42 Q100,34 122,42" stroke="#5DADE2" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="50" rx="15" ry="6" fill="rgba(255,255,255,0.2)"/>
    `,
    flower_crown: `
      <circle cx="60" cy="54" r="10" fill="#FF69B4"/>
      <circle cx="60" cy="54" r="5" fill="#FFD700"/>
      <circle cx="80" cy="48" r="11" fill="#FFB6C1"/>
      <circle cx="80" cy="48" r="5" fill="#FFD700"/>
      <circle cx="100" cy="45" r="12" fill="#FF69B4"/>
      <circle cx="100" cy="45" r="6" fill="#FFD700"/>
      <circle cx="120" cy="48" r="11" fill="#FFB6C1"/>
      <circle cx="120" cy="48" r="5" fill="#FFD700"/>
      <circle cx="140" cy="54" r="10" fill="#FF69B4"/>
      <circle cx="140" cy="54" r="5" fill="#FFD700"/>
      <path d="M60,54 Q100,65 140,54" stroke="#228B22" stroke-width="6" fill="none"/>
    `,
    tie: `
      <path d="M90,178 L100,215 L110,178 Z" fill="#2C3E50"/>
      <path d="M86,172 L114,172 L110,178 L90,178 Z" fill="#34495E"/>
      <circle cx="100" cy="188" r="3" fill="#ECF0F1"/>
      <path d="M95,180 L100,200 L105,180" stroke="#1A252F" stroke-width="1" fill="none" opacity="0.3"/>
    `,
    headphones: `
      <path d="M38,108 Q38,38 100,38 Q162,38 162,108" stroke="#1A1A2E" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M38,108 Q38,38 100,38 Q162,38 162,108" stroke="#6C5CE7" stroke-width="8" fill="none" stroke-linecap="round"/>
      <rect x="28" y="100" width="24" height="44" rx="12" fill="#1A1A2E"/>
      <rect x="32" y="104" width="16" height="36" rx="8" fill="#6C5CE7" opacity="0.5"/>
      <rect x="148" y="100" width="24" height="44" rx="12" fill="#1A1A2E"/>
      <rect x="152" y="104" width="16" height="36" rx="8" fill="#6C5CE7" opacity="0.5"/>
    `,
    beanie: `
      <path d="M38,80 Q100,0 162,80 L160,100 Q100,88 40,100 Z" fill="#6C5CE7"/>
      <rect x="38" y="86" width="124" height="18" rx="8" fill="#5B4FCF"/>
      <circle cx="100" cy="12" r="8" fill="#6C5CE7"/>
      <path d="M50,85 Q70,82 90,85 Q110,82 130,85 Q150,82 160,85" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none"/>
    `,
    hijab: `
      <path d="M32,80 Q38,18 100,14 Q162,18 168,80 Q178,190 150,235 Q100,258 50,235 Q22,190 32,80 Z" fill="#5B4FCF"/>
      <ellipse cx="100" cy="115" rx="62" ry="70" fill="SKIN_TONE"/>
      <path d="M32,80 Q100,60 168,80" stroke="#6C5CE7" stroke-width="3" fill="none"/>
      <path d="M38,120 Q100,110 162,120" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none"/>
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
    facialHair,
    eyeStyle,
    eyeColor,
    mouthStyle,
    glasses,
    accessories,
    clothingColor,
    bgColor,
  } = config;

  const hairDark = darkenHex(hairColor, 30);
  const hairLight = lightenHex(hairColor, 40);

  let hairSVG = getHairPath(hairStyle, gender)
    .replace(/fill="HAIR_LIGHT"/g, `fill="${hairLight}"`)
    .replace(/fill="HAIR_DARK"/g, `fill="${hairDark}"`)
    .replace(/fill="HAIR"/g, `fill="${hairColor}"`);

  let accessorySVG = getAccessorySVG(accessories, gender).replace(/SKIN_TONE/g, skinTone);

  return `
<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${lightenHex(bgColor, 20)};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${bgColor};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <circle cx="100" cy="140" r="100" fill="${bgColor}"/>
  <circle cx="100" cy="140" r="100" fill="url(#bgGrad)"/>

  <!-- Neck -->
  <rect x="88" y="168" width="24" height="32" rx="8" fill="${skinTone}"/>
  <rect x="86" y="196" width="28" height="8" rx="3" fill="${darkenHex(skinTone, 10)}" opacity="0.3"/>

  <!-- Shoulders / Body -->
  ${gender === 'girl'
    ? '<path d="M28,250 Q48,192 100,186 Q152,192 172,250 Q148,262 100,265 Q52,262 28,250 Z" fill="#E91E8C"/>'
    : '<path d="M26,250 Q46,190 100,184 Q154,190 174,250 Q148,264 100,266 Q52,264 26,250 Z" fill="#3498DB"/>'}
  <path d="M26,250 Q46,188 100,184 Q154,188 174,250 Q148,264 100,266 Q52,264 26,250 Z" fill="${clothingColor || (gender === 'girl' ? '#E91E8C' : '#3498DB')}"/>

  <!-- Body detail - collar/shading -->
  <path d="M80,210 Q100,225 120,210" stroke="rgba(255,255,255,0.3)" stroke-width="3" fill="none"/>
  <path d="M70,230 Q100,245 130,230" stroke="rgba(0,0,0,0.1)" stroke-width="2" fill="none"/>
  <ellipse cx="100" cy="220" rx="20" ry="8" fill="rgba(255,255,255,0.15)"/>

  <!-- Head -->
  <ellipse cx="100" cy="115" rx="66" ry="72" fill="${skinTone}"/>

  <!-- Head highlight -->
  <ellipse cx="85" cy="90" rx="25" ry="20" fill="rgba(255,255,255,0.12)"/>

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
  <path d="M60,94 Q76,84 92,92" stroke="${hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M108,92 Q124,84 140,94" stroke="${hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Eyebrow highlights -->
  <path d="M65,92 Q76,85 87,91" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
  <path d="M113,91 Q124,85 135,92" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>

  <!-- Eyes -->
  ${getEyesSVG(eyeStyle, eyeColor)}

  <!-- Facial Hair -->
  ${getFacialHairSVG(facialHair || 'none', hairColor)}

  <!-- Nose -->
  <path d="M97,118 Q94,132 100,138 Q106,132 103,118" stroke="${darkenHex(skinTone, 20)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="100" cy="135" rx="6" ry="3" fill="rgba(255,200,200,0.2)"/>

  <!-- Cheek blush -->
  <ellipse cx="58" cy="128" rx="14" ry="9" fill="rgba(255,150,150,0.45)"/>
  <ellipse cx="142" cy="128" rx="14" ry="9" fill="rgba(255,150,150,0.45)"/>
  <ellipse cx="58" cy="126" rx="8" ry="5" fill="rgba(255,180,180,0.3)"/>
  <ellipse cx="142" cy="126" rx="8" ry="5" fill="rgba(255,180,180,0.3)"/>

  <!-- Mouth -->
  ${getMouthSVG(mouthStyle)}

  <!-- Freckles (cute subtle detail) -->
  <circle cx="66" cy="120" r="1.2" fill="${darkenHex(skinTone, 20)}" opacity="0.35"/>
  <circle cx="72" cy="124" r="1.2" fill="${darkenHex(skinTone, 20)}" opacity="0.35"/>
  <circle cx="68" cy="127" r="1.2" fill="${darkenHex(skinTone, 20)}" opacity="0.35"/>
  <circle cx="128" cy="124" r="1.2" fill="${darkenHex(skinTone, 20)}" opacity="0.35"/>
  <circle cx="134" cy="120" r="1.2" fill="${darkenHex(skinTone, 20)}" opacity="0.35"/>
  <circle cx="132" cy="127" r="1.2" fill="${darkenHex(skinTone, 20)}" opacity="0.35"/>

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
  ${accessorySVG}
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
  skinTone: '#FDD9B5',
  hairStyle: 'long_straight',
  hairColor: '#5A3825',
  facialHair: 'none',
  eyeStyle: 'normal',
  eyeColor: '#2c3e50',
  mouthStyle: 'smile',
  glasses: 'none',
  accessories: 'none',
  clothingColor: '#FF6B9D',
  bgColor: '#FFE8F6',
};

const SECTIONS = [
  {key: 'gender', label: 'Gender', type: 'chip', icon: '👤'},
  {key: 'skinTone', label: 'Skin Tone', type: 'color', icon: '🎨'},
  {key: 'hairStyle', label: 'Hair Style', type: 'chip_dynamic', icon: '💇'},
  {key: 'hairColor', label: 'Hair Color', type: 'color', icon: '🎨'},
  {key: 'facialHair', label: 'Facial Hair', type: 'chip', icon: '🧔'},
  {key: 'eyeStyle', label: 'Eyes', type: 'chip', icon: '👁️'},
  {key: 'eyeColor', label: 'Eye Color', type: 'color', icon: '🎨'},
  {key: 'mouthStyle', label: 'Mouth', type: 'chip', icon: '😊'},
  {key: 'glasses', label: 'Glasses', type: 'chip', icon: '👓'},
  {key: 'accessories', label: 'Accessories', type: 'chip', icon: '💎'},
  {key: 'clothingColor', label: 'Outfit Color', type: 'color', icon: '👕'},
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
        next.facialHair = 'none';
        next.clothingColor = value === 'girl' ? '#E91E8C' : '#3498DB';
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
      facialHair: g === 'boy' ? pick(AVATAR_OPTIONS.facialHair) : 'none',
      eyeStyle: pick(AVATAR_OPTIONS.eyeStyle),
      eyeColor: pick(AVATAR_OPTIONS.eyeColor),
      mouthStyle: pick(AVATAR_OPTIONS.mouthStyle),
      glasses: pick(AVATAR_OPTIONS.glasses),
      accessories: pick(AVATAR_OPTIONS.accessories),
      clothingColor: pick(AVATAR_OPTIONS.clothingColor),
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