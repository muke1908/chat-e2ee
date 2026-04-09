/**
 * Worker script for RTCRtpScriptTransform-based WebRTC media encryption/decryption.
 *
 * The worker receives the local and remote AES-GCM CryptoKey objects via
 * `postMessage({ type: 'init', localKey, remoteKey })` and handles the
 * `rtctransform` event to encrypt or decrypt each encoded media frame.
 *
 * Exported as a string so it can be turned into an inline Blob-URL Worker
 * without requiring any additional bundler plugins or separate file serving.
 */
export const WEBRTC_TRANSFORM_WORKER_SCRIPT = `
let localKey = null;
let remoteKey = null;

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'init') {
        localKey = event.data.localKey;
        remoteKey = event.data.remoteKey;
    }
});

async function processTransform(transformer) {
    const operation = transformer.options.operation;
    const reader = transformer.readable.getReader();
    const writer = transformer.writable.getWriter();
    try {
        while (true) {
            const result = await reader.read();
            if (result.done) break;
            const frame = result.value;
            try {
                if (operation === 'encrypt' && localKey) {
                    const iv = crypto.getRandomValues(new Uint8Array(12));
                    const encrypted = await crypto.subtle.encrypt(
                        { name: 'AES-GCM', iv },
                        localKey,
                        frame.data
                    );
                    const combined = new Uint8Array(12 + encrypted.byteLength);
                    combined.set(iv, 0);
                    combined.set(new Uint8Array(encrypted), 12);
                    frame.data = combined.buffer;
                } else if (operation === 'decrypt' && remoteKey) {
                    const data = new Uint8Array(frame.data);
                    const frameIv = data.slice(0, 12);
                    const encryptedData = data.slice(12);
                    const decrypted = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: frameIv },
                        remoteKey,
                        encryptedData
                    );
                    frame.data = decrypted;
                }
                writer.write(frame);
            } catch (err) {
                // Skip frames that cannot be processed (e.g. decryption failure)
            }
        }
    } finally {
        writer.releaseLock();
    }
}

self.addEventListener('rtctransform', function(event) {
    processTransform(event.transformer).catch(function() {});
});
`;
