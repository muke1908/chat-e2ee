import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import Chat from './chat';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

ReactDOM.render(
  <Router>
    <Switch>
      <Route exact path="/" component={App} />
      <Route exact path="/chat/:uuid" component={Chat} />
    </Switch>
  </Router>,
  document.getElementById('root')
);
