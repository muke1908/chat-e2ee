/**
 * Call overlay component
 */

import React, { useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useCallTimer } from '../../hooks/useCallTimer';
import { Button } from '../common/Button';
import { EndCallIcon } from '../common/icons';
import './CallOverlay.css';

export const CallOverlay: React.FC = () => {
  const { callActive, callStatus, endCall } = useChat();
  const { duration, formatDuration, startTimer, stopTimer } = useCallTimer();

  useEffect(() => {
    if (callActive && callStatus === 'Connected') {
      startTimer();
    } else {
      stopTimer();
    }
  }, [callActive, callStatus, startTimer, stopTimer]);

  if (!callActive) return null;

  const handleEndCall = async () => {
    await endCall();
  };

  return (
    <div className="blur-overlay">
      <div className="call-info">
        <div className="call-avatar shimmer"></div>
        <h3 id="call-status" className="call-status">
          {callStatus || 'Calling...'}
        </h3>
        <p id="call-duration" className="call-duration">
          {formatDuration(duration)}
        </p>
        <Button
          id="end-call-btn"
          variant="danger"
          circle
          size="large"
          onClick={handleEndCall}
          title="End Call"
        >
          <EndCallIcon size={32} />
        </Button>
      </div>
    </div>
  );
};
