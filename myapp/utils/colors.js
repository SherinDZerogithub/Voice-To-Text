export const getContrastColor = hexcolor => {
  if (!hexcolor || hexcolor === 'transparent') {
    return '#000000';
  }

  const hex = hexcolor.replace('#', '');
  if (hex.length !== 6) {
    return '#000000';
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 128 ? '#1a1a2e' : '#ffffff';
};

// Premium Design Tokens
export const DESIGN_TOKENS = {
  primary: '#7c6ff7',
  primaryLight: '#c4b5fd',
  primaryDark: '#5b4fcf',
  secondary: '#f093fb',
  accent: '#f093fb',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1a1a2e',
  textSecondary: '#9ca3af',
  border: '#e5e7eb',
  shadow: '#7c6ff7',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  glassBackground: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
};
