import React, { useState, createContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = (props) => {
  const [darkMode, setDarkMode] = useState(true);
  const [lightMode, setLightMode] = [darkMode, setDarkMode];
  return (
    <ThemeContext.Provider value={[darkMode, setDarkMode]}>{props.children}</ThemeContext.Provider>
  );
};
