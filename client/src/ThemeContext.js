import React, { useState, createContext } from 'react';
import { LS } from './utils/storage';

export const ThemeContext = createContext();

let presetDarkMode = LS.get('theme');
presetDarkMode = presetDarkMode === null ? true : presetDarkMode;

export const ThemeProvider = (props) => {
  const [darkMode, setDarkMode] = useState(presetDarkMode);
  return (
    <ThemeContext.Provider value={[darkMode, setDarkMode]}>{props.children}</ThemeContext.Provider>
  );
};
