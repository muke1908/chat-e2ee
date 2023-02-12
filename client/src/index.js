import React, {useContext} from 'react';
import ReactDOM from 'react-dom';
import styles from './Style.module.css';
import ChatLink from './pages/chatlink';
import Messaging from './pages/messaging';
import ChatError from "./pages/chaterror";
import {ThemeProvider, ThemeContext} from './ThemeContext.js';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import {ErrorProvider} from "./ErrorContext.js";
import {Provider} from 'react-redux';
import store from './utils/store.js';

const App = () => {
    const [darkMode] = useContext(ThemeContext);
    return (
        <div className={`${styles.defaultMode} ${!darkMode && styles.lightMode} `}>
            <Router>
                <div className={styles.bodyContent}>
                    <Switch>
                        <Route exact path="/" component={ChatLink}/>
                        <Route exact path="/error" component={ChatError}/>
                        <Route exact path="/chat/:channelID" component={Messaging}/>
                    </Switch>
                </div>
            </Router>
        </div>
    );
};



ReactDOM.render(

        <Provider store={store}>
            <ErrorProvider>
                <ThemeProvider>
                    <App/>
                </ThemeProvider>
            </ErrorProvider>
        </Provider>
    ,
    document.getElementById('root')
);

