import { useEffect, useState } from 'react';

interface CallOverlayProps {
  status: string;
  onEndCall: () => void;
}

/**
 * Call overlay component for audio call interface
 * 
 * Manages:
 * - Call status display
 * - Call duration timer
 * - End call functionality
 * - Visual feedback during active calls
 */
function CallOverlay({ status, onEndCall }: CallOverlayProps) {
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const [callStartTime, setCallStartTime] = useState<number>(0);

  useEffect(() => {
    if (status.toLowerCase() === 'connected') {
      setCallStartTime(Date.now());
    }
  }, [status]);

  useEffect(() => {
    if (status.toLowerCase() === 'connected' && callStartTime > 0) {
      const timer = setInterval(() => {
        const seconds = Math.floor((Date.now() - callStartTime) / 1000);
        const m = Math.floor(seconds / 60)
          .toString()
          .padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        setCallDuration(`${m}:${s}`);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, callStartTime]);

  return (
    <div className="glass blur-overlay">
      <div className="call-info">
        <div className="call-avatar shimmer"></div>
        <h3 id="call-status">{status}</h3>
        <p id="call-duration">{callDuration}</p>
        <button onClick={onEndCall} className="danger circle large">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default CallOverlay;
