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
  const { callActive, callStatus, isIncomingCall, callLifecycleState, endCall, acceptCall, rejectCall, cancelCall } = useChat();
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
    if (callLifecycleState === 'ringing') {
      await cancelCall();
      return;
    }
    await endCall();
  };

  const handleAcceptCall = async () => {
    await acceptCall();
  };

  const handleRejectCall = async () => {
    await rejectCall();
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
        {isIncomingCall ? (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" size="medium" onClick={handleAcceptCall} title="Accept Call">
              Accept
            </Button>
            <Button variant="danger" size="medium" onClick={handleRejectCall} title="Decline Call">
              Decline
            </Button>
          </div>
        ) : (
          <Button
            id="end-call-btn"
            variant="danger"
            circle
            size="large"
            onClick={handleEndCall}
            title={callLifecycleState === 'ringing' ? 'Cancel Call' : 'End Call'}
          >
            <EndCallIcon size={32} />
          </Button>
        )}
      </div>
    </div>
  );
};
