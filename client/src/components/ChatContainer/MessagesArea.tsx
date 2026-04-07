/**
 * Messages area component
 */

import React, { useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import './MessagesArea.css';

export const MessagesArea: React.FC = () => {
  const { messages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main id="messages-area" className="messages-area">
      {messages.length === 0 ? (
        <div className="empty-state">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </main>
  );
};
