import React, {createContext, useContext, useMemo, useState} from 'react';

const ThemeContext = createContext({
  moodColor: '#7c6ff7',
  moodBackground: '#f5f5f5',
  contrastText: '#1a1a2e',
  setMoodColor: () => {},
  setMoodBackground: () => {},
});

const ThemeProvider = ({children}) => {
  const [moodColor, setMoodColor] = useState('#7c6ff7');
  const [moodBackground, setMoodBackground] = useState('#f5f5f5');
  const contrastText = useMemo(() => {
    const hexcolor = moodBackground || '#f5f5f5';
    const hex = hexcolor.replace('#', '');
    if (hex.length !== 6) return '#1a1a2e';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#1a1a2e' : '#ffffff';
  }, [moodBackground]);

  const value = useMemo(
    () => ({
      moodColor,
      moodBackground,
      contrastText,
      setMoodColor,
      setMoodBackground,
    }),
    [moodColor, moodBackground, contrastText],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

const useTheme = () => useContext(ThemeContext);

export {ThemeContext, ThemeProvider, useTheme};
