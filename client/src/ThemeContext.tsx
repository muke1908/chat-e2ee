import React, { useState, createContext } from "react";
import storage from "./utils/storage";

let presetDarkMode = storage.get("theme");
presetDarkMode = presetDarkMode === null ? true : presetDarkMode;

export const ThemeContext = createContext(presetDarkMode);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [darkMode, setDarkMode] = useState(presetDarkMode);
  return <ThemeContext.Provider value={[darkMode, setDarkMode]}>{children}</ThemeContext.Provider>;
};
