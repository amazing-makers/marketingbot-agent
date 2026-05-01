import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 채널별 세션 저장 경로 반환
 */
export function getSessionPath(channelId: string): string {
    const dir = path.join(app.getPath('userData'), 'sessions', channelId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'storage-state.json');
}

/**
 * 세션 파일 존재 여부 확인
 */
export function hasSession(channelId: string): boolean {
    return fs.existsSync(getSessionPath(channelId));
}

import { BrowserContext } from 'playwright';
import * as os from 'os';
import { encryptToFile } from './crypto/storage-encrypt';

/**
 * 브라우저 컨텍스트 상태를 암호화하여 저장
 */
export async function saveEncryptedSession(context: BrowserContext, channelId: string): Promise<void> {
    const tempFile = path.join(os.tmpdir(), `mb-save-${channelId}-${Date.now()}.json`);
    const finalFile = getSessionPath(channelId);
    
    try {
        // 1. 임시 평문 파일에 저장
        await context.storageState({ path: tempFile });
        
        // 2. 평문 읽기
        const plaintext = fs.readFileSync(tempFile, 'utf8');
        
        // 3. 암호화하여 최종 경로에 저장
        encryptToFile(finalFile, plaintext);
        
        console.log(`[Session] Encrypted session saved for ${channelId}`);
    } catch (err) {
        console.error(`[Session] Failed to save encrypted session for ${channelId}:`, err);
    } finally {
        // 4. 임시 평문 파일 즉시 삭제
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}
