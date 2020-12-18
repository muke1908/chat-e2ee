import React, { useContext } from 'react';
import ReactDOM from 'react-dom';
import styles from './Style.module.css';

import ChatLink from './pages/chatlink';
import Messaging from './pages/messaging';
import { ThemeProvider, ThemeContext } from './ThemeContext.js';

import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';

const App = () => {
  const [darkMode] = useContext(ThemeContext);
  return (
    <div className={`${styles.defaultMode} ${!darkMode && styles.lightMode} `}>
      <Router>
        <div className={styles.bodyContent}>
          <Switch>
            <Route exact path="/" component={ChatLink} />{' '}
            <Route exact path="/chat/:channelID" component={Messaging} />{' '}
            {/* <Redirect exact from="/chat/:channelID?locked=false" component={LockedMessaging} />
                  <Redirect exact from="/chat/:channelID?locked=true" component={Messaging} />
                  */}{' '}
          </Switch>{' '}
        </div>{' '}
      </Router>{' '}
    </div>
  );
};

ReactDOM.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  document.getElementById('root')
);
