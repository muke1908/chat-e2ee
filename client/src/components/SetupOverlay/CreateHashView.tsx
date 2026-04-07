/**
 * Create hash view component
 */

import React, { useState } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { CopyIcon } from '../common/icons';
import './CreateHashView.css';

interface CreateHashViewProps {
  hash: string;
  onHashGenerated: (hash: string) => void;
  onCopyClick: () => void;
  onBack: () => void;
  onNext: () => void;
}

export const CreateHashView: React.FC<CreateHashViewProps> = ({
  hash,
  onHashGenerated,
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
        <label>Your Channel Hash</label>
        <div className="copy-input">
          <Input
            value={hash}
            onChange={() => { }}
            placeholder="Generating..."
            readOnly
          />
          <Button
            variant="secondary"
            size="small"
            onClick={handleCopy}
            title="Copy Hash"
          >
            <CopyIcon size={20} />
          </Button>
        </div>
        {copied && <span className="copy-feedback">Copied!</span>}
      </div>

      <div className="button-group">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onNext}>
          Connect Securely
        </Button>
      </div>
    </div>
  );
};
