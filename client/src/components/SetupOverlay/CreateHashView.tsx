/**
 * Create-invite view component.
 *
 * Displays the shareable invitation link
 * (`#room=<public-room-id>&secret=<secret>`). The secret is generated on
 * this device and is only ever carried in the link's URL fragment — never
 * sent to the server.
 */

import React, { useState } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { CopyIcon } from '../common/icons';
import './CreateHashView.css';

interface CreateHashViewProps {
  inviteLink: string;
  onCopyClick: () => void;
  onBack: () => void;
  onNext: () => void;
}

export const CreateHashView: React.FC<CreateHashViewProps> = ({
  inviteLink,
  onCopyClick,
  onBack,
  onNext,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="create-hash-view">
      <div className="input-group">
        <label>Your Invitation Link</label>
        <div className="copy-input">
          <Input
            id="generated-hash-display"
            value={inviteLink}
            onChange={() => { }}
            placeholder="Generating..."
            readOnly
          />
          <Button
            variant="secondary"
            size="small"
            onClick={handleCopy}
            title="Copy Invitation Link"
          >
            <CopyIcon size={20} />
          </Button>
        </div>
        {copied && <span className="copy-feedback">Copied!</span>}
      </div>

      <div className="button-group">
        <Button id="back-btn" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button id="join-btn" variant="primary" onClick={onNext} disabled={!inviteLink}>
          Connect Securely
        </Button>
      </div>
    </div>
  );
};
