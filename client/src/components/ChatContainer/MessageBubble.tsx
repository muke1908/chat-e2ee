/**
 * Message bubble component
 */

import React from 'react';
import { Message } from '../../types/index';
import { formatMessageTime } from '../../utils/messageHandling';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  return (
    <div className={`message ${message.type}`}>
      <div className="message-text">{message.text}</div>
      <div className="message-meta">
        <span>{message.sender.substring(0, 8)}...</span>
        <span>{formatMessageTime(message.timestamp)}</span>
      </div>
    </div>
  );
};
