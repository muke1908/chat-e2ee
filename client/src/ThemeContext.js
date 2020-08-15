import React, { useState, createContext } from 'react';
import storage from './utils/storage.js';

export const ThemeContext = createContext();

const theme = storage.get('theme');

export const ThemeProvider = (props) => {
  const [darkMode, setDarkMode] = useState(theme);
  return (
    <ThemeContext.Provider value={[darkMode, setDarkMode]}>{props.children}</ThemeContext.Provider>
  );
};
