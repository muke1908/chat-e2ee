/**
 * Chat E2EE - React Client Application
 * 
 * A modern React-based client for end-to-end encrypted chat.
 * Uses @chat-e2ee/service SDK for backend communication and encryption.
 * 
 * Key features:
 * - End-to-end encrypted messaging using RSA and AES
 * - Audio calling with WebRTC
 * - Channel-based communication with shareable hashes
 * - No user registration required
 */

import { useState, useEffect, useCallback } from 'react';
import { createChatInstance, utils } from '@chat-e2ee/service';
import SetupOverlay from './components/SetupOverlay';
import ChatContainer from './components/ChatContainer';
import CallOverlay from './components/CallOverlay';
import './style.css';

interface Message {
  sender: string;
  text: string;
  type: 'sent' | 'received';
  timestamp: Date;
}

/**
 * Main application component for Chat E2EE
 * 
 * Manages the overall application state including:
 * - Chat initialization and connection
 * - Message handling and display
 * - Audio call functionality
 * - User interface state (setup vs chat view)
 */
function App() {
  const [chat, setChat] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [channelHash, setChannelHash] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [showSetup, setShowSetup] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<string>('');
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [setupError, setSetupError] = useState<string>('');

  // Initialize chat on mount
  useEffect(() => {
    const initChat = async () => {
      try {
        const chatInstance = createChatInstance();
        await chatInstance.init();
        const keys = chatInstance.getKeyPair();
        setPrivateKey(keys.privateKey);
        setChat(chatInstance);
      } catch (err) {
        console.error('Init error:', err);
        setSetupError('Initialization failed. Refresh and try again.');
      }
    };
    initChat();
  }, []);

  // Setup chat listeners
  useEffect(() => {
    if (!chat) return;

    const handleAliceJoin = () => {
      setPeerConnected(true);
    };

    const handleAliceDisconnect = () => {
      setPeerConnected(false);
    };

    const handleChatMessage = async (msg: any) => {
      try {
        const plainText = await (utils as any).decryptMessage(msg.message, privateKey);
        setMessages((prev) => [
          ...prev,
          {
            sender: msg.sender,
            text: plainText,
            type: 'received',
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error('Message decrypt error:', err);
      }
    };

    const handleCallAdded = (call: any) => {
      setCurrentCall(call);
      setCallActive(true);
      setCallStatus('Incoming Call...');
      setupCallListeners(call);
    };

    chat.on('on-alice-join', handleAliceJoin);
    chat.on('on-alice-disconnect', handleAliceDisconnect);
    chat.on('chat-message', handleChatMessage);
    chat.on('call-added', handleCallAdded);

    // Note: The chat SDK doesn't support removing listeners
  }, [chat, privateKey]);

  const setupCallListeners = (call: any) => {
    call.on('state-changed', (state: string) => {
      setCallStatus(state.charAt(0).toUpperCase() + state.slice(1));

      if (state === 'closed' || state === 'failed') {
        setCallActive(false);
      }
    });
  };

  const handleJoinChannel = async (hash: string) => {
    if (!chat) {
      setSetupError('Chat not initialized');
      return;
    }

    try {
      const newUserId = (utils as any).generateUUID();
      setUserId(newUserId);
      await chat.setChannel(hash, newUserId);
      setChannelHash(hash);
      setShowSetup(false);
      setSetupError('');

      // Check for existing users
      const users = await chat.getUsersInChannel();
      if (users && users.length > 1) {
        setPeerConnected(true);
      }

      // Update URL hash
      window.location.hash = hash;
    } catch (err) {
      console.error('Join error:', err);
      setSetupError('Failed to connect.');
      throw err;
    }
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chat || !text.trim()) return;

      setMessages((prev) => [
        ...prev,
        {
          sender: userId,
          text,
          type: 'sent',
          timestamp: new Date(),
        },
      ]);

      try {
        await chat.encrypt({ text }).send();
      } catch (err) {
        console.error('Send error:', err);
      }
    },
    [chat, userId]
  );

  const startCall = useCallback(async () => {
    if (!chat) return;

    try {
      const call = await chat.startCall();
      setCurrentCall(call);
      setCallActive(true);
      setCallStatus('Calling...');
      setupCallListeners(call);
    } catch (err: any) {
      alert(err.message);
    }
  }, [chat]);

  const endCall = useCallback(async () => {
    if (currentCall) {
      await currentCall.endCall();
      setCallActive(false);
      setCurrentCall(null);
    }
  }, [currentCall]);

  return (
    <div id="app">
      {showSetup ? (
        <SetupOverlay
          chat={chat}
          onJoinChannel={handleJoinChannel}
          error={setupError}
        />
      ) : (
        <ChatContainer
          channelHash={channelHash}
          messages={messages}
          peerConnected={peerConnected}
          onSendMessage={sendMessage}
          onStartCall={startCall}
        />
      )}
      {callActive && (
        <CallOverlay
          status={callStatus}
          onEndCall={endCall}
        />
      )}
    </div>
  );
}

export default App;
