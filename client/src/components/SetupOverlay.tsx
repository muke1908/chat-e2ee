import { useState, useEffect } from 'react';

interface SetupOverlayProps {
  chat: any;
  onJoinChannel: (hash: string) => Promise<void>;
  error: string;
}

type ViewType = 'initial' | 'create' | 'join';

function SetupOverlay({ chat, onJoinChannel, error }: SetupOverlayProps) {
  const [view, setView] = useState<ViewType>('initial');
  const [generatedHash, setGeneratedHash] = useState<string>('');
  const [enteredHash, setEnteredHash] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Check for URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.length > 5) {
      setEnteredHash(hash);
      setView('join');
    }
  }, []);

  const handleShowCreate = async () => {
    setView('create');
    try {
      setGeneratedHash('Generating...');
      const linkObj = await chat.getLink();
      setGeneratedHash(linkObj.hash);
    } catch (err) {
      setStatusMessage('Failed to generate hash.');
    }
  };

  const handleShowJoin = () => {
    setView('join');
  };

  const handleBack = () => {
    setView('initial');
    setGeneratedHash('');
    setEnteredHash('');
    setStatusMessage('');
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(generatedHash);
    const originalMessage = statusMessage;
    setStatusMessage('Hash copied to clipboard!');
    setTimeout(() => setStatusMessage(originalMessage), 2000);
  };

  const handleJoin = async () => {
    const finalHash = enteredHash || generatedHash;

    if (!finalHash) {
      setStatusMessage('Please enter or generate a hash.');
      return;
    }

    try {
      setIsJoining(true);
      setStatusMessage('Connecting...');
      await onJoinChannel(finalHash);
    } catch (err) {
      setIsJoining(false);
      // Error is handled in parent
    }
  };

  return (
    <div className="overlay">
      <div className="overlay-content glass">
        <h1>Secure Messenger</h1>
        <p>Simple. End-to-End Encrypted. Private.</p>

        {view === 'initial' && (
          <div className="button-group-vertical">
            <button onClick={handleShowCreate} className="primary large">
              Create New Channel
            </button>
            <button onClick={handleShowJoin} className="secondary large">
              Already have a Hash?
            </button>
          </div>
        )}

        {view === 'create' && (
          <>
            <div className="input-group">
              <label>Your Channel Hash</label>
              <div className="copy-input">
                <input
                  type="text"
                  value={generatedHash}
                  readOnly
                  placeholder="Generating..."
                />
                <button onClick={handleCopyHash} className="icon-btn small">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'join' && (
          <div className="input-group">
            <label htmlFor="channel-hash">Channel Hash</label>
            <input
              type="text"
              id="channel-hash"
              value={enteredHash}
              onChange={(e) => setEnteredHash(e.target.value)}
              placeholder="Enter hash to join..."
            />
          </div>
        )}

        {view !== 'initial' && (
          <div className="button-group">
            <button onClick={handleBack} className="secondary">
              Back
            </button>
            <button onClick={handleJoin} className="primary" disabled={isJoining}>
              Connect Securely
            </button>
          </div>
        )}

        {(statusMessage || error) && (
          <div className="status-text">{error || statusMessage}</div>
        )}
      </div>
    </div>
  );
}

export default SetupOverlay;
