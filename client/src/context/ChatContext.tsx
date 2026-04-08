/**
 * Chat context provider - wraps the existing @chat-e2ee/service
 * No modifications to the service itself
 */

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { createChatInstance, utils } from '@chat-e2ee/service';
import type { IChatE2EE, IE2ECall } from '@chat-e2ee/service';
import { ChatContextType, Message } from '../types/index';
import { createMessage } from '../utils/messageHandling';
import { playBeep } from '../utils/audioNotification';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chat, setChat] = useState<IChatE2EE | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [channelHash, setChannelHash] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);

  // Initialize chat service (no modifications)
  const initializeChat = useCallback(async () => {
    try {
      const chatInstance = createChatInstance({
        baseUrl: process.env.CHATE2EE_API_URL || 'http://localhost:3001',
      });
      await chatInstance.init();

      const keys = chatInstance.getKeyPair();
      setPrivateKey(keys.privateKey);
      setChat(chatInstance);
    } catch (err) {
      console.error('Chat initialization failed:', err);
      throw err;
    }
  }, []);

  // Create new channel
  const createNewChannel = useCallback(async (): Promise<string> => {
    if (!chat) throw new Error('Chat not initialized');
    try {
      const linkObj = await chat.getLink();
      return linkObj.hash;
    } catch (err) {
      console.error('Failed to create channel:', err);
      throw err;
    }
  }, [chat]);

  // Join existing channel
  const joinChannel = useCallback(
    async (hash: string) => {
      if (!chat) throw new Error('Chat not initialized');
      try {
        // Auto-generate User ID
        const newUserId = (utils as any).generateUUID();
        setUserId(newUserId);

        // setChannel returns void but has async operations inside
        chat.setChannel(hash, newUserId);
        setChannelHash(hash);
        setIsConnected(true);

        // Setup listeners
        setupChatListeners(chat);

        // Check for existing users
        await checkExistingUsers(chat);
      } catch (err) {
        console.error('Failed to join channel:', err);
        throw err;
      }
    },
    [chat]
  );

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!chat || !userId) throw new Error('Chat not ready');
      try {
        const message = createMessage(userId, text, 'sent');
        addMessage(message);
        await chat.encrypt({ text, image: '' }).send();
      } catch (err) {
        console.error('Failed to send message:', err);
        throw err;
      }
    },
    [chat, userId]
  );

  // Start call
  const startCall = useCallback(async () => {
    if (!chat) throw new Error('Chat not initialized');
    try {
      const call = await chat.startCall();
      setCallActive(true);
      setupCallListeners(call);
    } catch (err) {
      console.error('Failed to start call:', err);
      throw err;
    }
  }, [chat]);

  // End call
  const endCall = useCallback(async () => {
    try {
      if (chat) {
        chat.endCall();
      }
      setCallActive(false);
      setCallDuration(0);
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  }, [chat]);

  // Add message to state
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // Setup chat listeners
  const setupChatListeners = (chatInstance: IChatE2EE) => {
    chatInstance.on('on-alice-join', () => {
      playBeep();
      setIsConnected(true);
    });

    chatInstance.on('on-alice-disconnect', () => {
      setIsConnected(false);
    });

    chatInstance.on('chat-message', async (msg: any) => {
      try {
        const plainText = await (utils as any).decryptMessage(msg.message, privateKey);
        const message = createMessage(msg.sender, plainText, 'received');
        addMessage(message);
      } catch (err) {
        console.error('Failed to decrypt message:', err);
      }
    });

    chatInstance.on('call-added', (call: IE2ECall) => {
      setCallActive(true);
      setCallStatus('Incoming Call...');
      setupCallListeners(call);
    });
  };

  // Setup call listeners
  const setupCallListeners = (call: IE2ECall) => {
    call.on('state-changed', async () => {
      const state = call.state;
      setCallStatus(state.charAt(0).toUpperCase() + state.slice(1));

      if (state === 'closed' || state === 'failed') {
        setCallActive(false);
        setCallDuration(0);
        setCallStatus('');
      }
    });
  };

  // Check for existing users
  const checkExistingUsers = async (chatInstance: IChatE2EE) => {
    try {
      const users = await chatInstance.getUsersInChannel();
      if (users && users.length > 1) {
        playBeep();
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Error checking users:', err);
    }
  };

  const value: ChatContextType = {
    chat,
    userId,
    channelHash,
    privateKey,
    messages,
    isConnected,
    callActive,
    callStatus,
    callDuration,
    initializeChat,
    createNewChannel,
    joinChannel,
    sendMessage,
    startCall,
    endCall,
    addMessage,
    setCallDuration,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use chat context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
