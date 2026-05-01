import { safeStorage } from 'electron';
import Store from 'electron-store';
import { randomBytes } from 'crypto';

const store = new Store<{ encryptedKey?: string }>({
    name: 'machine-key',
});

const KEY_LENGTH = 32;

export function getMachineKey(): Buffer {
    // safeStorage 사용 가능 (macOS Keychain, Windows DPAPI, Linux libsecret)
    if (safeStorage.isEncryptionAvailable()) {
        let encrypted = store.get('encryptedKey');
        if (!encrypted) {
            const newKey = randomBytes(KEY_LENGTH);
            const buf = safeStorage.encryptString(newKey.toString('hex'));
            store.set('encryptedKey', buf.toString('base64'));
            return newKey;
        }
        const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
        return Buffer.from(decrypted, 'hex');
    }
    
    // fallback: electron-store 자체 (덜 안전하지만 실행은 보장)
    console.warn('[MachineKey] safeStorage 사용 불가 — electron-store 사용');
    let plainKey = (store as any).get('plainKey');
    if (!plainKey) {
        plainKey = randomBytes(KEY_LENGTH).toString('hex');
        (store as any).set('plainKey', plainKey);
    }
    return Buffer.from(plainKey, 'hex');
}
