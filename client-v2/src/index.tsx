import React, { useContext } from "react";
import ReactDOM from "react-dom";
// import styles from '@Style.module.css';
import styles from "./Style.module.css";

import ChatLink from "./pages/chatlink";
import Messaging from "./pages/messaging";
import { ThemeProvider, ThemeContext } from "./ThemeContext";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

const App = () => {
  const [darkMode] = useContext(ThemeContext);
  return (
    <div
      style={{ background: darkMode ? "#121212" : "#f2f2f2", paddingBottom: "10px" }}
      className={`${styles.defaultMode} ${!darkMode && styles.lightMode} `}
    >
      <Router>
        <div className={styles.bodyContent}>
          <Switch>
            <Route exact path="/" component={ChatLink} />
            <Route exact path="/chat/:channelID" component={Messaging} />
          </Switch>
        </div>
      </Router>
    </div>
  );
};

ReactDOM.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  document.getElementById("root")
);
