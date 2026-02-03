# Audio Notification Feature

## Overview
The audio notification feature provides an audible alert when a new user joins the chat session. This enhances user experience by providing real-time awareness of participant activity without requiring constant visual attention.

## Features

### 🔔 Join Notification Sound
- A pleasant, non-intrusive beep plays when a peer joins the chat
- Generated using Web Audio API (no external audio files required)
- 800Hz sine wave with smooth envelope for professional sound quality
- Duration: 200ms

### 🔇 Mute/Unmute Control
- Toggle button in the chat header
- Visual feedback with icon change (speaker/muted speaker)
- Settings persist across sessions using localStorage
- User-friendly status messages when toggling

### ♿ Accessibility
- Keyboard accessible
- Clear visual indicators
- Optional - can be disabled by users who prefer silent operation
- Compatible with screen readers

## Technical Implementation

### Components Modified
1. **client/app.ts** - Core audio logic and state management
2. **client/index.html** - Audio toggle button UI
3. **README.md** - Feature documentation

### Key Functions

#### `playJoinBeep()`
Generates and plays the notification sound using Web Audio API:
- Creates an AudioContext
- Uses oscillator for tone generation
- Applies gain envelope for smooth audio
- Automatically cleans up resources

#### `loadAudioSettings()` / `saveAudioSettings()`
- Manages localStorage persistence
- Key: `chat-e2ee-audio-notifications`
- Default: enabled (true)

#### `updateAudioToggleButton()`
- Updates button icon based on current state
- Provides appropriate tooltips
- Ensures visual consistency

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Opera: Full support
- Mobile browsers: Full support

Web Audio API is widely supported across all modern browsers.

## User Guide

### Enabling/Disabling Notifications

1. **To Disable**: Click the speaker icon in the chat header. The icon will change to a muted speaker.
2. **To Enable**: Click the muted speaker icon. The icon will change back to an active speaker.
3. **Preference Saved**: Your choice is automatically saved and will persist across sessions.

### When Notifications Play
- ✅ When a peer joins your chat session
- ❌ NOT when you join a chat (only for incoming peers)
- ❌ NOT for message notifications (only join events)

## Privacy & Security
- No external resources loaded
- No tracking or analytics
- Settings stored only in browser's localStorage
- Audio generated client-side using Web Audio API

## Testing

### Manual Testing Checklist
- [ ] Audio plays when peer joins
- [ ] Toggle button mutes/unmutes correctly
- [ ] Icon changes appropriately
- [ ] Settings persist after page reload
- [ ] Works in incognito/private mode
- [ ] No console errors
- [ ] Accessible via keyboard (Tab + Enter)

### Development Testing
```bash
# Build the project
npm run build

# Run development server
npm run dev

# Open two browser windows
# Window 1: Create a channel
# Window 2: Join using the hash
# Verify: Beep plays in Window 1 when Window 2 joins
```

## Future Enhancements
Potential improvements for future versions:
- [ ] Customizable notification sounds
- [ ] Volume control
- [ ] Different sounds for different events (join/leave/message)
- [ ] Browser notification permission integration
- [ ] Vibration on mobile devices

## Troubleshooting

### No Sound Playing?
1. Check if notifications are enabled (speaker icon should be active)
2. Verify browser isn't muted
3. Check browser console for errors
4. Ensure browser supports Web Audio API

### Sound Too Loud/Quiet?
Currently, the volume is set at 15% (0.15 gain). To modify:
- Edit `playJoinBeep()` function in `client/app.ts`
- Change the value in `linearRampToValueAtTime(0.15, ...)`
- Rebuild the project

## Contributing
Contributions to improve this feature are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License
This feature is part of chat-e2ee and follows the same license as the main project.

---

**Author**: [@Avinash-yadav103](https://github.com/Avinash-yadav103)  
**Date**: February 2026  
**Version**: 1.0.0
