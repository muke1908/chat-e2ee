import { createChatInstance, utils } from '@chat-e2ee/service';

// State
let chat: any = null;
let userId: string = '';
let channelHash: string = '';
let privateKey: string = '';

// Audio notification settings
let audioNotificationsEnabled: boolean = true;
const AUDIO_SETTINGS_KEY = 'chat-e2ee-audio-notifications';

// DOM Elements
// DOM Elements
const setupOverlay = document.getElementById('setup-overlay')!;
const initialActions = document.getElementById('initial-actions')!;
const createHashView = document.getElementById('create-hash-view')!;
const joinHashView = document.getElementById('join-hash-view')!;
const finalActions = document.getElementById('final-actions')!;

const showCreateBtn = document.getElementById('show-create-hash') as HTMLButtonElement;
const showJoinBtn = document.getElementById('show-join-hash') as HTMLButtonElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const copyHashBtn = document.getElementById('copy-hash-btn') as HTMLButtonElement;

const generatedHashDisplay = document.getElementById('generated-hash-display') as HTMLInputElement;
const hashInput = document.getElementById('channel-hash') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const setupStatus = document.getElementById('setup-status')!;

const chatContainer = document.getElementById('chat-container')!;
const messagesArea = document.getElementById('messages-area')!;
const msgInput = document.getElementById('msg-input') as HTMLInputElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const startCallBtn = document.getElementById('start-call-btn') as HTMLButtonElement;
const chatHeader = document.querySelector('header')!;
const participantInfo = document.getElementById('participant-info')!;
const headerHashDisplay = document.getElementById('channel-hash-display')!;
const headerHashText = document.getElementById('header-hash')!;
const copyHeaderHashBtn = document.getElementById('copy-header-hash') as HTMLButtonElement;
const audioToggleBtn = document.getElementById('audio-toggle-btn') as HTMLButtonElement;

// Call Elements
const callOverlay = document.getElementById('call-overlay')!;
const callStatusText = document.getElementById('call-status')!;
const endCallBtn = document.getElementById('end-call-btn') as HTMLButtonElement;
const callDuration = document.getElementById('call-duration')!;

// Audio Notification Functions
function loadAudioSettings() {
    const saved = localStorage.getItem(AUDIO_SETTINGS_KEY);
    audioNotificationsEnabled = saved === null ? true : saved === 'true';
    updateAudioToggleButton();
}

function saveAudioSettings() {
    localStorage.setItem(AUDIO_SETTINGS_KEY, audioNotificationsEnabled.toString());
}

function updateAudioToggleButton() {
    if (audioToggleBtn) {
        const icon = audioToggleBtn.querySelector('svg');
        if (audioNotificationsEnabled) {
            audioToggleBtn.title = 'Mute join notifications';
            if (icon) {
                icon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>`;
            }
        } else {
            audioToggleBtn.title = 'Unmute join notifications';
            if (icon) {
                icon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;
            }
        }
    }
}

function playJoinBeep() {
    if (!audioNotificationsEnabled) return;
    
    try {
        // Create AudioContext
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configure beep: pleasant notification sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz
        
        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play beep
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
        // Cleanup
        oscillator.onended = () => {
            audioContext.close();
        };
    } catch (err) {
        console.error('Audio notification error:', err);
    }
}

// Initialize Chat
async function initChat() {
    try {
        setupStatus.textContent = 'Initializing secure keys...';
        chat = createChatInstance();
        await chat.init();

        const keys = chat.getKeyPair();
        privateKey = keys.privateKey;
        setupStatus.textContent = '';

        // Load audio settings
        loadAudioSettings();

        // Check for URL hash on load
        handleUrlHash();
    } catch (err) {
        console.error('Init error:', err);
        setupStatus.textContent = 'Initialization failed. Refresh and try again.';
    }
}

// UI Navigation
function showView(view: 'initial' | 'create' | 'join') {
    initialActions.classList.add('hidden');
    createHashView.classList.add('hidden');
    joinHashView.classList.add('hidden');
    finalActions.classList.add('hidden');
    setupStatus.textContent = '';

    if (view === 'initial') {
        initialActions.classList.remove('hidden');
    } else if (view === 'create') {
        createHashView.classList.remove('hidden');
        finalActions.classList.remove('hidden');
    } else if (view === 'join') {
        joinHashView.classList.remove('hidden');
        finalActions.classList.remove('hidden');
        hashInput.focus();
    }
}

showCreateBtn.addEventListener('click', async () => {
    showView('create');
    try {
        generatedHashDisplay.value = 'Generating...';
        const linkObj = await chat.getLink();
        generatedHashDisplay.value = linkObj.hash;
        channelHash = linkObj.hash;
    } catch (err) {
        setupStatus.textContent = 'Failed to generate hash.';
    }
});

showJoinBtn.addEventListener('click', () => {
    showView('join');
});

backBtn.addEventListener('click', () => {
    showView('initial');
    channelHash = '';
    hashInput.value = '';
});

copyHashBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(generatedHashDisplay.value);
    const originalText = setupStatus.textContent;
    setupStatus.textContent = 'Hash copied to clipboard!';
    setTimeout(() => setupStatus.textContent = originalText, 2000);
});

copyHeaderHashBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(headerHashText.textContent || '');
    const originalText = setupStatus.textContent;
    setupStatus.textContent = 'Hash copied to clipboard!';
    setTimeout(() => setupStatus.textContent = originalText, 2000);
});

async function checkExistingUsers() {
    try {
        const users = await chat.getUsersInChannel();
        if (users && users.length > 1) {
            chatHeader.classList.add('active');
            participantInfo.textContent = 'Peer is already here. Communication is encrypted.';
        }
    } catch (err) {
        console.error('Error checking users:', err);
    }
}

function updateUrlHash(hash: string) {
    if (hash) {
        window.location.hash = hash;
    }
}

function handleUrlHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.length > 5) {
        hashInput.value = hash;
        showView('join');
    }
}

joinBtn.addEventListener('click', async () => {
    // Determine which hash to use
    const enteredHash = hashInput.value.trim();
    const finalHash = enteredHash || channelHash;

    if (!finalHash) {
        setupStatus.textContent = 'Please enter or generate a hash.';
        return;
    }

    // Auto-generate User ID
    if (!userId) {
        userId = (utils as any).generateUUID();
    }

    try {
        joinBtn.disabled = true;
        setupStatus.textContent = 'Connecting...';
        await chat.setChannel(finalHash, userId);

        // Update UI with Hash
        headerHashText.textContent = finalHash;
        headerHashDisplay.classList.remove('hidden');
        updateUrlHash(finalHash);

        setupOverlay.classList.add('hidden');
        chatContainer.classList.remove('hidden');

        setupChatListeners();
        await checkExistingUsers();
    } catch (err) {
        console.error('Join error:', err);
        setupStatus.textContent = 'Failed to connect.';
        joinBtn.disabled = false;
    }
});

function setupChatListeners() {
    chat.on('on-alice-join', () => {
        chatHeader.classList.add('active');
        participantInfo.textContent = 'Peer joined. Communication is encrypted.';
        playJoinBeep(); // Play notification sound
    });

    chat.on('on-alice-disconnect', () => {
        chatHeader.classList.remove('active');
        participantInfo.textContent = 'Peer disconnected.';
    });

    chat.on('chat-message', async (msg: any) => {
        const plainText = await (utils as any).decryptMessage(msg.message, privateKey);
        appendMessage(msg.sender, plainText, 'received');
    });

    chat.on('call-added', (call: any) => {
        showCallOverlay('Incoming Call...');
        setupCallListeners(call);
    });
}

// Messaging
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    msgInput.value = '';
    appendMessage(userId, text, 'sent');

    try {
        await chat.encrypt({ text }).send();
    } catch (err) {
        console.error('Send error:', err);
    }
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function appendMessage(sender: string, text: string, type: 'sent' | 'received') {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${type}`;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.innerHTML = `
        <div class="message-text">${text}</div>
        <div class="message-meta">
            <span>${sender}</span>
            <span>${time}</span>
        </div>
    `;

    messagesArea.appendChild(msgEl);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Calling
let callTimer: any = null;
let callStartTime: number = 0;

startCallBtn.addEventListener('click', async () => {
    try {
        const call = await chat.startCall();
        showCallOverlay('Calling...');
        setupCallListeners(call);
    } catch (err: any) {
        alert(err.message);
    }
});

function setupCallListeners(call: any) {
    call.on('state-changed', (state: string) => {
        callStatusText.textContent = state.charAt(0).toUpperCase() + state.slice(1);

        if (state === 'connected') {
            startTimer();
        }

        if (state === 'closed' || state === 'failed') {
            hideCallOverlay();
            stopTimer();
        }
    });

    endCallBtn.onclick = async () => {
        await call.endCall();
        hideCallOverlay();
        stopTimer();
    };
}

function startTimer() {
    stopTimer();
    callStartTime = Date.now();
    callTimer = setInterval(() => {
        const seconds = Math.floor((Date.now() - callStartTime) / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        callDuration.textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    if (callTimer) clearInterval(callTimer);
    callDuration.textContent = '00:00';
}

function showCallOverlay(status: string) {
    callOverlay.classList.remove('hidden');
    callStatusText.textContent = status;
}

function hideCallOverlay() {
    callOverlay.classList.add('hidden');
}

// Audio Toggle Button Handler
if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
        audioNotificationsEnabled = !audioNotificationsEnabled;
        saveAudioSettings();
        updateAudioToggleButton();
        
        // Show feedback
        const originalText = participantInfo.textContent;
        participantInfo.textContent = audioNotificationsEnabled 
            ? 'Join notifications enabled' 
            : 'Join notifications muted';
        setTimeout(() => {
            if (participantInfo.textContent === 'Join notifications enabled' || 
                participantInfo.textContent === 'Join notifications muted') {
                participantInfo.textContent = originalText || 'Waiting for someone to join...';
            }
        }, 2000);
    });
}

// Start
initChat();
