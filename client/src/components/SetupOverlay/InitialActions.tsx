/**
 * Initial actions for setup overlay
 */

import React from 'react';
import { Button } from '../common/Button';
import './InitialActions.css';

interface InitialActionsProps {
  onCreateClick: () => void;
  onJoinClick: () => void;
}

export const InitialActions: React.FC<InitialActionsProps> = ({ onCreateClick, onJoinClick }) => {
  return (
    <div className="initial-actions">
      {/* 1. Added a custom heading/subtext to notice right away */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ color: '#00ff00', fontSize: '14px', fontFamily: 'monospace' }}>
          &gt; SYSTEM STATUS: READY_TO_CONNECT
        </p>
      </div>

      <Button variant="primary" size="large" onClick={onCreateClick}>
        Start New Secure Chat
      </Button>
      
      <Button variant="secondary" size="large" onClick={onJoinClick}>
        Have an invite hash?
      </Button>
    </div>
  );
};