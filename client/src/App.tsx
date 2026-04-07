/**
 * Main App component
 */

import React, { useEffect, useState } from 'react';
import { useChat } from './context/ChatContext';
import { SetupOverlay } from './components/SetupOverlay/SetupOverlay';
import { ChatContainer } from './components/ChatContainer/ChatContainer';
import { updateUrlHash } from './utils/callTimer';
import './styles/global.css';

const AppContent: React.FC = () => {
  const { initializeChat, joinChannel, channelHash } = useChat();
  const [showSetup, setShowSetup] = useState(true);
  const [error, setError] = useState<string>('');

  // Initialize chat on mount
  useEffect(() => {
    initializeChat().catch((err) => {
      setError('Failed to initialize chat. Please refresh the page.');
      console.error('Initialization error:', err);
    });
  }, [initializeChat]);

  const handleSetupComplete = async (hash: string) => {
    try {
      setError('');
      await joinChannel(hash);
      updateUrlHash(hash);
      setShowSetup(false);
    } catch (err) {
      setError((err as any).message || 'Failed to connect. Please try again.');
      console.error('Setup error:', err);
    }
  };

  return (
    <>
      <SetupOverlay onSetupComplete={handleSetupComplete} isHidden={!showSetup} />
      <ChatContainer isHidden={showSetup} />
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '0.5rem',
            zIndex: 999,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};

export default AppContent;
