import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getMachineKey } from './machine-key';
import * as fs from 'fs';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const FILE_HEADER = 'MBENC1\n';  // 암호화 파일 식별을 위한 헤더

export function encryptToFile(filepath: string, plaintext: string): void {
    const key = getMachineKey();
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
    fs.writeFileSync(filepath, FILE_HEADER + payload, 'utf8');
}

export function decryptFromFile(filepath: string): string {
    if (!fs.existsSync(filepath)) throw new Error('File not found');
    const content = fs.readFileSync(filepath, 'utf8');
    
    // 평문(이전 버전) 감지 → 자동 마이그레이션
    if (!content.startsWith(FILE_HEADER)) {
        // 평문 그대로 반환 + 이후를 위해 즉시 암호화 저장
        encryptToFile(filepath, content);
        return content;
    }
    
    const payload = content.slice(FILE_HEADER.length);
    const data = Buffer.from(payload, 'base64');
    const iv = data.subarray(0, IV_LEN);
    const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = data.subarray(IV_LEN + TAG_LEN);
    
    const key = getMachineKey();
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
