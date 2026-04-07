# Chat E2EE Client - React.js Implementation

This is the React.js implementation of the Chat E2EE client, migrated from vanilla TypeScript while maintaining full functional parity with the original.

## 📋 Project Structure

```
src/
├── components/          # All React components
│   ├── common/         # Reusable UI components (Button, Input, Icons)
│   ├── SetupOverlay/   # Channel creation/joining flow
│   ├── ChatContainer/  # Main chat interface
│   └── CallOverlay/    # Audio call UI
├── context/            # React Context for global state
│   └── ChatContext.tsx # Chat service wrapper and state management
├── hooks/              # Custom React hooks
│   ├── useCallTimer.ts
│   ├── useUrlHash.ts
│   └── useAudioNotification.ts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── audioNotification.ts
│   ├── messageHandling.ts
│   └── callTimer.ts
├── styles/             # Global styles
│   └── global.css
├── App.tsx             # Main application component
└── main.tsx            # React application entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

```bash
cd client
npm install
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The compiled output will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## 🏗️ Architecture

### State Management
- **ChatContext**: Wraps the `@chat-e2ee/service` package without any modifications
- Global state includes: connection status, messages, call status, user ID, and channel hash
- All service initialization and event handling is managed through React hooks

### Component Hierarchy

```
App
├── ChatProvider (Context)
│   ├── SetupOverlay
│   │   ├── InitialActions
│   │   ├── CreateHashView
│   │   └── JoinHashView
│   └── ChatContainer
│       ├── ChatHeader
│       ├── MessagesArea
│       │   └── MessageBubble (repeated)
│       ├── ChatFooter
│       └── CallOverlay
```

### Key Features
- ✅ Full end-to-end message encryption
- ✅ Audio call support
- ✅ Real-time peer detection
- ✅ Glass-morphism UI design
- ✅ Mobile-responsive layout
- ✅ Native share API integration
- ✅ URL hash auto-population for channel joining

## 🔒 Security & Backend Integration

**Important:** All backend communication and encryption logic is handled by the `@chat-e2ee/service` package. This client implementation:
- ✅ Does NOT modify any service logic
- ✅ Does NOT change API contracts
- ✅ Only wraps the service with React state management
- ✅ Preserves all encryption/decryption calls

Backend environment variable:
```bash
CHATE2EE_API_URL=http://localhost:3001  # or your backend URL
```

## 📱 Responsive Design

The UI is fully responsive and tested on:
- Desktop browsers (1920x1080+)
- Tablets (768px+)
- Mobile phones (320px+)
- iOS Safe Area support for notches

## 🔄 Migration Notes

This is a pure UI layer refactoring from vanilla TypeScript to React.js:

**What Changed:**
- DOM manipulation replaced with React components
- Event listeners replaced with React hooks and Context
- Global variables replaced with React state
- CSS organization improved with component-scoped styling

**What Stayed the Same:**
- All service integration unchanged
- All encryption logic unchanged
- All API calls unchanged
- All user-facing functionality identical
- All UI/UX identical

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create new channel flow
- [ ] Join existing channel flow
- [ ] Send/receive messages in real-time
- [ ] Audio call initiation and termination
- [ ] Copy hash functionality
- [ ] URL hash auto-population
- [ ] Peer detection and status indicators
- [ ] Mobile responsiveness
- [ ] Message animations
- [ ] Call duration timer

### Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🛠️ Development

### Adding a New Component

1. Create component directory in `src/components/`
2. Add component file (`.tsx`) and styles file (`.css`)
3. Export from component file using named export
4. Import and use in parent component

### Adding a New Hook

1. Create hook file in `src/hooks/`
2. Use React hooks (useState, useEffect, useCallback, etc.)
3. Export custom hook with `use` prefix
4. Import in components that need it

### Styling Guidelines

- Use CSS classes for styling (not inline styles)
- Follow BEM-like naming: `component-name`, `component-name__element`
- Import CSS in component file for scoped styling
- Use CSS variables from `styles/global.css` for consistency
- Maintain mobile-first responsive design

## 📦 Dependencies

- `react@^18.2.0` - React library
- `react-dom@^18.2.0` - React DOM rendering
- `@chat-e2ee/service@*` - E2EE messaging service (unmodified)
- `typescript@^5.6.2` - TypeScript compiler
- `vite@^5.4.1` - Build tool

## 🐛 Troubleshooting

### Chat not initializing
- Check `CHATE2EE_API_URL` environment variable
- Verify backend server is running
- Check browser console for detailed errors

### Messages not sending
- Ensure peer has joined the channel
- Check network connection
- Verify encryption keys are initialized

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires v16+)
- Clear `node_modules` and reinstall if needed

## 📄 License

Same as the main Chat E2EE project.

## 🤝 Contributing

This is part of the open-source Chat E2EE project. When contributing:

1. **Only modify files within the `client/` folder**
2. **Do not change `@chat-e2ee/service` imports or behavior**
3. **Maintain full backward compatibility with the service**
4. **Test all features before submitting PR**
5. **Follow the existing code style and component patterns**

For specific contribution guidelines, see the main project README.

---

Made with ❤️ for secure, private communication
