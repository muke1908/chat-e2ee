/**
 * Join hash view component
 */

import React, { useEffect } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useUrlHash } from '../../hooks/useUrlHash';
import './JoinHashView.css';

interface JoinHashViewProps {
  hash: string;
  onHashChange: (hash: string) => void;
  onBack: () => void;
  onJoin: () => void;
}

export const JoinHashView: React.FC<JoinHashViewProps> = ({
  hash,
  onHashChange,
  onBack,
  onJoin,
}) => {
  const { hash: urlHash } = useUrlHash();

  // Auto-populate from URL if available
  useEffect(() => {
    if (urlHash && !hash) {
      onHashChange(urlHash);
    }
  }, [urlHash, hash, onHashChange]);

  return (
    <div className="join-hash-view">
      <Input
        label="Channel Hash"
        placeholder="Enter hash to join..."
        value={hash}
        onChange={onHashChange}
      />

      <div className="button-group">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onJoin} disabled={!hash.trim()}>
          Connect Securely
        </Button>
      </div>
    </div>
  );
};
