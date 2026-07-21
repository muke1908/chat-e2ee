/**
 * Chat header component
 */

import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { Button } from '../common/Button';
import { CopyIcon, ShareIcon, PhoneIcon, TrashIcon } from '../common/icons';
import './ChatHeader.css';

interface ChatHeaderProps {
  onStartCall: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onStartCall }) => {
  const { isConnected, channelHash, deleteChannel } = useChat();
  const [hashCopied, setHashCopied] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(window.location.href);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const handleShare = () => {
    if ('share' in navigator) {
      navigator
        .share({
          title: 'Chat E2EE',
          text: 'Join my end-to-end encrypted chat',
          url: window.location.href,
        })
        .catch(() => {
          /* user cancelled */
        });
    }
  };

const handleDelete = async () => {
  if (!window.confirm('Are you sure you want to delete this secure channel? This cannot be undone.')) return;

  try {
    await deleteChannel();
    window.location.hash = ''; // Clear URL hash
  } catch (err) {
    console.error('Failed to delete channel:', err);
    alert((err as any).message || 'Failed to delete channel');
  }
};

  return (
    <header className={`chat-header glass ${isConnected ? 'active' : ''}`}>
      <div className="header-info">
        <div className="title-row">
          <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
          <h2 className="channel-title">Secure Channel</h2>
          <span className="badge">E2EE</span>
        </div>
        {channelHash && (
          <div className="hash-badge-container">
            <span className="hash-text">{channelHash}</span>
            <Button
              className="btn--icon btn--tiny"
              variant="secondary"
              onClick={handleCopyHash}
              title="Copy Link"
            >
              <CopyIcon size={14} />
            </Button>
            {hashCopied && <span className="copy-feedback-small">Copied!</span>}
          </div>
        )}
        <p className="participant-info">
          {isConnected ? 'Peer joined. Communication is encrypted.' : 'Waiting for someone to join...'}
        </p>
      </div>
      <div className="header-actions">
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button
            className="btn--icon"
            variant="secondary"
            onClick={handleShare}
            title="Share Link"
          >
            <ShareIcon size={20} />
          </Button>
        )}
        <Button
          className="btn--icon"
          variant="secondary"
          onClick={onStartCall}
          title="Start Audio Call"
        >
          <PhoneIcon size={20} />
        </Button>
        <Button
          className="btn--icon"
          variant="danger"
          onClick={handleDelete}
          title="Delete Chat"
          disabled={!channelHash}
        >
          <TrashIcon size={20} />
        </Button>
      </div>
    </header>
  );
};
