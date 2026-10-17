// ===============================================================
//  FILE HANDLER — Drag & Drop, Clipboard Paste & E2EE File/Image
//  Max Size: 10 MB | Formats: PNG, JPG, WEBP, GIF, PDF, TXT, JSON, CSV, LOG
// ===============================================================

export class FileHandler {
    constructor(cryptoEngine) {
        this.crypto = cryptoEngine;
        this.MAX_BYTES = 10 * 1024 * 1024; // 10 MB per PROMPT.md
        this.ALLOWED_EXT = [
            'png', 'jpg', 'jpeg', 'webp', 'gif',
            'pdf', 'txt', 'json', 'csv', 'log', 'md'
        ];
    }

    validateFile(file) {
        if (!file) throw new Error('No file selected.');
        if (file.size > this.MAX_BYTES) {
            throw new Error(`File "${file.name}" exceeds 10 MB limit.`);
        }
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const isImg = file.type && file.type.startsWith('image/');
        if (!isImg && !this.ALLOWED_EXT.includes(ext)) {
            throw new Error(`Unsupported file format (.${ext}).`);
        }
        return true;
    }

    async prepareAttachment(file, isEncryptedChannel = false) {
        this.validateFile(file);
        const buffer = await file.arrayBuffer();
        const isImage = file.type.startsWith('image/');

        if (isEncryptedChannel) {
            if (!this.crypto.isReady()) {
                throw new Error('Unlock E2EE Vault passphrase before encrypting files.');
            }
            const encBinary = await this.crypto.encryptBinary(buffer);
            const encMeta = await this.crypto.encryptText(JSON.stringify({
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                isImage
            }));
            return {
                e2ee: true,
                encryptedMeta: encMeta,
                encryptedData: encBinary,
                size: file.size
            };
        }

        const base64Data = this.crypto._bufferToBase64(buffer);
        return {
            e2ee: false,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            isImage,
            dataUrl: `data:${file.type || 'application/octet-stream'};base64,${base64Data}`
        };
    }

    async resolveAttachment(attachment) {
        if (!attachment) return null;
        if (!attachment.e2ee) {
            return {
                unlocked: true,
                name: attachment.name,
                mimeType: attachment.mimeType,
                size: attachment.size,
                isImage: attachment.isImage,
                url: attachment.dataUrl
            };
        }

        if (!this.crypto.isReady()) {
            return {
                unlocked: false,
                reason: 'VAULT_LOCKED',
                fingerprint: attachment.encryptedData?.fingerprint || 'UNKNOWN',
                size: attachment.size
            };
        }

        try {
            const metaJson = await this.crypto.decryptText(attachment.encryptedMeta);
            const meta = JSON.parse(metaJson);
            const decryptedBuffer = await this.crypto.decryptBinary(attachment.encryptedData);
            const blob = new Blob([decryptedBuffer], { type: meta.mimeType });
            const objectUrl = URL.createObjectURL(blob);
            return {
                unlocked: true,
                e2eeVerified: true,
                name: meta.name,
                mimeType: meta.mimeType,
                size: meta.size,
                isImage: meta.isImage,
                url: objectUrl,
                fingerprint: attachment.encryptedData.fingerprint
            };
        } catch (_) {
            return {
                unlocked: false,
                reason: 'KEY_MISMATCH',
                fingerprint: attachment.encryptedData?.fingerprint || 'UNKNOWN',
                size: attachment.size
            };
        }
    }

    formatSize(bytes) {
        if (!bytes || bytes < 1024) return `${bytes || 0} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}
