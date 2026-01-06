interface MessageProps {
  message: {
    sender: string;
    text: string;
    type: 'sent' | 'received';
    timestamp: Date;
  };
}

/**
 * Individual message component
 * 
 * Displays a single chat message with:
 * - Message text
 * - Sender information
 * - Timestamp
 * - Styling based on sent/received type
 */
function Message({ message }: MessageProps) {
  const time = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message ${message.type}`}>
      <div className="message-text">{message.text}</div>
      <div className="message-meta">
        <span>{message.sender}</span>
        <span>{time}</span>
      </div>
    </div>
  );
}

export default Message;
