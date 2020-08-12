import React, { useState, createContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = (props) => {
  const [darkMode, setDarkMode] = useState(true);
  return (
    <ThemeContext.Provider value={[darkMode, setDarkMode]}>{props.children}</ThemeContext.Provider>
  );
};
