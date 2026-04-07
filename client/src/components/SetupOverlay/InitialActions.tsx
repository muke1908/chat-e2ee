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
      <Button variant="primary" size="large" onClick={onCreateClick}>
        Create New Channel
      </Button>
      <Button variant="secondary" size="large" onClick={onJoinClick}>
        Already have a Hash?
      </Button>
    </div>
  );
};
