/**
 * Application entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatProvider } from './context/ChatContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(
  <React.StrictMode>
    <ChatProvider>
      <App />
    </ChatProvider>
  </React.StrictMode>
);
