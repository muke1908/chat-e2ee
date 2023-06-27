import React, { useContext } from "react";
import { ThemeContext } from "../../ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";
import styles from "./Style.module.css";
import { LS } from "../../utils/storage";

const ThemeToggle = () => {
  const [darkMode, setDarkMode] = useContext(ThemeContext);

  const toggleTheme = () => {
    LS.set("theme", !darkMode);
    setDarkMode(!darkMode);
  };

  return (
    <span className={styles.toggleIcon}>
      {darkMode === true ? (
        <FiSun className={styles.FiSun} onClick={toggleTheme} />
      ) : (
        <FiMoon className={styles.FiMoon} onClick={toggleTheme} />
      )}
    </span>
  );
};

export default ThemeToggle;
