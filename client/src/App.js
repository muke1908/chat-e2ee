import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Link } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <Link className="App-link" to="/chat/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4muk">
          Test chat
        </Link>
      </header>
    </div>
  );
}

export default App;
