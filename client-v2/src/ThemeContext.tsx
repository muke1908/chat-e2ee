import React, { useState, createContext } from "react";
import { LS } from "./utils/storage";

let presetDarkMode = LS.get("theme");
presetDarkMode = presetDarkMode === null ? true : presetDarkMode;

export const ThemeContext = createContext(presetDarkMode);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [darkMode, setDarkMode] = useState(presetDarkMode);
  return <ThemeContext.Provider value={[darkMode, setDarkMode]}>{children}</ThemeContext.Provider>;
};
