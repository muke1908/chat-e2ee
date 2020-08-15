import React, { useState, createContext } from 'react';
import storage from './utils/storage.js';

export const ThemeContext = createContext();

let presetDarkMode = storage.get('theme');
presetDarkMode = presetDarkMode === null ? true : presetDarkMode;

export const ThemeProvider = (props) => {
  const [darkMode, setDarkMode] = useState(presetDarkMode);
  return (
    <ThemeContext.Provider value={[darkMode, setDarkMode]}>{props.children}</ThemeContext.Provider>
  );
};
