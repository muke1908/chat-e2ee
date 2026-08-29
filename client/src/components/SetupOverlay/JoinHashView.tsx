/**
 * Join-by-invite view component.
 *
 * Accepts a full invitation link/fragment (`#room=...&secret=...`) rather
 * than a bare room id — joining requires the secret, which never touches
 * the server.
 */

import React, { useEffect } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useUrlHash } from '../../hooks/useUrlHash';
import './JoinHashView.css';

interface JoinHashViewProps {
  inviteInput: string;
  onInviteInputChange: (value: string) => void;
  onBack: () => void;
  onJoin: () => void;
}

export const JoinHashView: React.FC<JoinHashViewProps> = ({
  inviteInput,
  onInviteInputChange,
  onBack,
  onJoin,
}) => {
  const { invite } = useUrlHash();

  // Auto-populate from the URL invite fragment if available
  useEffect(() => {
    if (invite && !inviteInput) {
      onInviteInputChange(`room=${invite.roomId}&secret=${invite.secret}`);
    }
  }, [invite, inviteInput, onInviteInputChange]);

  return (
    <div className="join-hash-view">
      <Input
        id="channel-hash"
        label="Invitation Link"
        placeholder="Paste the invite link you were sent..."
        value={inviteInput}
        onChange={onInviteInputChange}
      />

      <div className="button-group">
        <Button id="back-btn" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button id="join-btn" variant="primary" onClick={onJoin} disabled={!inviteInput.trim()}>
          Connect Securely
        </Button>
      </div>
    </div>
  );
};
