/**
 * Main SetupOverlay component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { parseInviteInput } from '../../utils/urlHash';
import { InitialActions } from './InitialActions';
import { CreateHashView } from './CreateHashView';
import { JoinHashView } from './JoinHashView';
import './SetupOverlay.css';

interface SetupOverlayProps {
  onSetupComplete: (roomId: string, secret: string) => Promise<void>;
  isHidden: boolean;
}

type ViewType = 'initial' | 'create' | 'join' | 'deleted';

export const SetupOverlay: React.FC<SetupOverlayProps> = ({ onSetupComplete, isHidden }) => {
  const { createNewChannel } = useChat();
  const [view, setView] = useState<ViewType>('initial');
  const [invite, setInvite] = useState<{ roomId: string; secret: string; link: string } | null>(null);
  const [joinInput, setJoinInput] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [, setIsLoading] = useState<boolean>(false);

  // Generate the invitation (room id from the server + a locally generated secret) when entering create view
  const generateInvite = useCallback(async () => {
    try {
      setStatus('Generating a secure invitation...');
      const created = await createNewChannel();
      setInvite({ roomId: created.roomId, secret: created.secret, link: created.absoluteLink || created.link });
      setStatus('');
    } catch (err) {
      setStatus('Failed to generate invitation. Please try again.');
      console.error('Invite generation error:', err);
    }
  }, [createNewChannel]);

  useEffect(() => {
    if (view === 'create' && !invite) {
      generateInvite();
    }
  }, [view, invite, generateInvite]);

  const handleCreateClick = () => {
    setView('create');
  };

  const handleJoinClick = () => {
    setView('join');
  };

  const handleBack = () => {
    setView('initial');
    setInvite(null);
    setJoinInput('');
    setStatus('');
  };

  const handleCopyHash = () => {
    if (invite) {
      navigator.clipboard.writeText(invite.link);
    }
  };

  const handleCreateNext = async () => {
    if (!invite) {
      setStatus('Please generate an invitation first.');
      return;
    }
    try {
      setIsLoading(true);
      setStatus('Connecting...');
      await onSetupComplete(invite.roomId, invite.secret);
    } catch (err) {
      setStatus('Failed to connect. Please try again.');
      console.error('Setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinNext = async () => {
    const parsed = parseInviteInput(joinInput);
    if (!parsed) {
      setStatus('Please enter a valid invitation link.');
      return;
    }
    try {
      setIsLoading(true);
      setStatus('Connecting...');
      await onSetupComplete(parsed.roomId, parsed.secret);
    } catch (err: any) {
      if (err.message === 'CHANNEL_DELETED') {
        setView('deleted');
        setStatus('');
      } else {
        setStatus('Failed to join channel. Please check the invitation link and try again.');
      }
      console.error('Join error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`overlay ${isHidden ? 'hidden' : ''}`}>
      <div className="overlay-content glass">
        <h1>CHAT_E2EE</h1>
        <p>// end-to-end encrypted · zero knowledge · ephemeral</p>

        {view === 'initial' && (
          <InitialActions
            onCreateClick={handleCreateClick}
            onJoinClick={handleJoinClick}
          />
        )}

        {view === 'create' && (
          <CreateHashView
            inviteLink={invite?.link || ''}
            onCopyClick={handleCopyHash}
            onBack={handleBack}
            onNext={handleCreateNext}
          />
        )}

        {view === 'join' && (
          <JoinHashView
            inviteInput={joinInput}
            onInviteInputChange={setJoinInput}
            onBack={handleBack}
            onJoin={handleJoinNext}
          />
        )}

        {view === 'deleted' && (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Channel Deleted</h2>
            <p style={{ opacity: 0.8, marginBottom: '2rem' }}>This secure channel has been permanently deleted and can no longer be accessed.</p>
            <button className="btn btn--primary" onClick={handleBack}>
              Return Home
            </button>
          </div>
        )}

        {status && <div id="setup-status" className="setup-status">{status}</div>}
      </div>
    </div>
  );
};
