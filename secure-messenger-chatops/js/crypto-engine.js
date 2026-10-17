// ===============================================================
//  CRYPTO ENGINE — W3C Web Crypto API (PBKDF2 + AES-256-GCM)
//  Zero-Knowledge Client-Side Encryption for Text & Binary Files
// ===============================================================

export class CryptoEngine {
    constructor() {
        this.activeKey = null;
        this.keyFingerprint = null;
        this.PBKDF2_ITERATIONS = 100000;
        this.SALT_PREFIX = 'ST8925LAB_E2EE_VAULT_V1_';
    }

    isReady() {
        return Boolean(this.activeKey && this.keyFingerprint);
    }

    getFingerprint() {
        return this.keyFingerprint || 'LOCKED';
    }

    clearKey() {
        this.activeKey = null;
        this.keyFingerprint = null;
    }

    async deriveKeyFromPassphrase(passphrase, roomSalt = 'PROJECT_04_DEFAULT') {
        if (!passphrase || passphrase.trim().length < 4) {
            throw new Error('Passphrase must be at least 4 characters.');
        }
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(passphrase.trim()),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const saltBytes = enc.encode(this.SALT_PREFIX + roomSalt);
        this.activeKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBytes,
                iterations: this.PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        const verifyBits = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: enc.encode(this.SALT_PREFIX + 'FINGERPRINT_' + roomSalt),
                iterations: 10000,
                hash: 'SHA-256'
            },
            keyMaterial,
            128
        );
        this.keyFingerprint = this._bufferToHex(verifyBits).slice(0, 12).toUpperCase();
        return this.keyFingerprint;
    }

    async encryptText(plaintext) {
        if (!this.activeKey) {
            throw new Error('E2EE Vault key is not unlocked.');
        }
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plaintext);
        const cipherBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.activeKey,
            encoded
        );
        return {
            alg: 'AES-256-GCM',
            iv: this._bufferToBase64(iv.buffer),
            ciphertext: this._bufferToBase64(cipherBuffer),
            fingerprint: this.keyFingerprint
        };
    }

    async decryptText(payload) {
        if (!this.activeKey) {
            throw new Error('VAULT_LOCKED');
        }
        const iv = this._base64ToUint8Array(payload.iv);
        const cipherBytes = this._base64ToUint8Array(payload.ciphertext);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.activeKey,
            cipherBytes
        );
        return new TextDecoder().decode(decryptedBuffer);
    }

    async encryptBinary(arrayBuffer) {
        if (!this.activeKey) {
            throw new Error('E2EE Vault key is not unlocked.');
        }
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const cipherBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.activeKey,
            arrayBuffer
        );
        return {
            alg: 'AES-256-GCM',
            iv: this._bufferToBase64(iv.buffer),
            ciphertext: this._bufferToBase64(cipherBuffer),
            fingerprint: this.keyFingerprint
        };
    }

    async decryptBinary(payload) {
        if (!this.activeKey) {
            throw new Error('VAULT_LOCKED');
        }
        const iv = this._base64ToUint8Array(payload.iv);
        const cipherBytes = this._base64ToUint8Array(payload.ciphertext);
        return await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.activeKey,
            cipherBytes
        );
    }

    _bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    _base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    _bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
