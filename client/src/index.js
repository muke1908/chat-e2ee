import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import ChatLink from './pages/chatlink';
import Messaging from './pages/messaging';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

ReactDOM.render(
  <Router>
    <div className="body-content">
      <Switch>
        <Route exact path="/" component={ChatLink} />
        <Route exact path="/chat/:uuid" component={Messaging} />
      </Switch>
    </div>
  </Router>,
  document.getElementById('root')
);
