/**
 * Type definitions for Chat E2EE application
 */

// Chat instance type from @chat-e2ee/service
export interface ChatInstance {
  init: () => Promise<void>;
  getKeyPair: () => { privateKey: string; publicKey: string };
  getLink: () => Promise<{ hash: string }>;
  setChannel: (hash: string, userId: string) => Promise<void>;
  getUsersInChannel: () => Promise<any[]>;
  startCall: () => Promise<Call>;
  on: (event: string, callback: Function) => void;
  encrypt: (data: { text: string }) => { send: () => Promise<void> };
}

// Message type
export interface Message {
  sender: string;
  text: string;
  type: 'sent' | 'received';
  timestamp: Date;
}

// Call type
export interface Call {
  on: (event: string, callback: Function) => void;
  endCall: () => Promise<void>;
  state?: string;
}

// Setup view states
export type SetupView = 'initial' | 'create' | 'join';

// Chat app state
export interface AppState {
  chat: ChatInstance | null;
  userId: string;
  channelHash: string;
  privateKey: string;
  setupView: SetupView;
  messages: Message[];
  isConnected: boolean;
  callActive: boolean;
}

// Chat context type
export interface ChatContextType {
  // State
  chat: ChatInstance | null;
  userId: string;
  channelHash: string;
  privateKey: string;
  messages: Message[];
  isConnected: boolean;
  callActive: boolean;
  callStatus: string;
  callDuration: number;

  // Methods
  initializeChat: () => Promise<void>;
  createNewChannel: () => Promise<string>;
  joinChannel: (hash: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  addMessage: (message: Message) => void;
  setCallDuration: (duration: number) => void;
}

// Common component props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'large';
  onClick: () => void;
  disabled?: boolean;
  icon?: boolean;
  circle?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  className?: string;
}

// Setup overlay props
export interface SetupOverlayProps {
  setupView: SetupView;
  onViewChange: (view: SetupView) => void;
  onChannelJoin: (hash: string) => Promise<void>;
  status?: string;
}
