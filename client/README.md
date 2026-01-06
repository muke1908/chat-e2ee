# Chat E2EE Client

React-based client application for Chat E2EE - a secure, end-to-end encrypted messaging platform.

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **@chat-e2ee/service** - SDK for backend communication and encryption

## Project Structure

```
client/
├── src/
│   ├── components/         # React components
│   │   ├── SetupOverlay.tsx    # Channel creation/join UI
│   │   ├── ChatContainer.tsx   # Main chat interface
│   │   ├── Message.tsx         # Individual message display
│   │   └── CallOverlay.tsx     # Audio call interface
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── style.css          # Global styles
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Development

### Prerequisites

- Node.js 16 or higher
- npm

### Setup

Install dependencies:
```bash
npm install
```

### Running the Dev Server

```bash
npm run dev
```

The client will start on `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The production build will be output to the `build/` directory.

### Running the Preview Server

```bash
npm run preview
```

## Features

- **End-to-End Encryption**: All messages are encrypted using RSA/AES encryption
- **Audio Calls**: WebRTC-based encrypted audio calling
- **Channel System**: Create or join channels using unique hashes
- **No Registration**: No user accounts or personal data required
- **Modern UI**: Clean, responsive design with glassmorphism effects

## How It Works

1. **Create Channel**: Generate a unique channel hash
2. **Share Hash**: Share the hash with the person you want to chat with
3. **Connect**: Both users connect to the same channel
4. **Chat Securely**: All messages are encrypted end-to-end

## Security

- Private keys are generated locally and never leave the device
- Messages are encrypted with recipient's public key
- Audio streams use insertable streams API for encryption
- No chat history is stored on the server

## Architecture

The client uses React for UI rendering and state management. Communication with the backend is handled through the `@chat-e2ee/service` SDK, which provides:

- Socket.io for real-time communication
- WebRTC for peer-to-peer audio calls
- Crypto utilities for encryption/decryption
- Channel and user management

## Notes

- The app requires a running backend server (configured via `CHATE2EE_API_URL`)
- By default, it connects to the production backend at `chat-e2ee-2.azurewebsites.net`
- For local development, ensure the backend server is running on the expected port
