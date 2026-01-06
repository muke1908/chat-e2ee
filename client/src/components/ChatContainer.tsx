import { useState, useRef, useEffect } from 'react';
import Message from './Message';

interface MessageType {
  sender: string;
  text: string;
  type: 'sent' | 'received';
  timestamp: Date;
}

interface ChatContainerProps {
  channelHash: string;
  messages: MessageType[];
  peerConnected: boolean;
  onSendMessage: (text: string) => void;
  onStartCall: () => void;
}

/**
 * Main chat container component
 * 
 * Displays:
 * - Chat header with connection status and channel hash
 * - Message list
 * - Message input and send functionality
 * - Audio call button
 */
function ChatContainer({
  channelHash,
  messages,
  peerConnected,
  onSendMessage,
  onStartCall,
}: ChatContainerProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(channelHash);
  };

  return (
    <div id="chat-container">
      <header className={`glass ${peerConnected ? 'active' : ''}`}>
        <div className="header-info">
          <div className="title-row">
            <span className="dot" id="status-dot"></span>
            <h2>Secure Channel</h2>
            <span className="badge">E2EE</span>
          </div>
          <div className="hash-badge-container">
            <span className="hash-text">{channelHash}</span>
            <button
              onClick={handleCopyHash}
              className="icon-btn tiny"
              title="Copy Hash"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
          <p id="participant-info">
            {peerConnected
              ? 'Peer joined. Communication is encrypted.'
              : 'Waiting for someone to join...'}
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={onStartCall}
            title="Start Audio Call"
            className="icon-btn"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
        </div>
      </header>

      <main id="messages-area">
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="glass">
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a secure message..."
          />
          <button onClick={handleSendMessage} className="primary circle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default ChatContainer;
