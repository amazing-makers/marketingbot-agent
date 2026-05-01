import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { encryptToFile } from '../crypto/storage-encrypt';

/**
 * 기존 평문 세션 파일들을 암호화된 형식으로 마이그레이션
 */
export function migrateExistingSessions(): void {
    const sessionsDir = path.join(app.getPath('userData'), 'sessions');
    
    if (!fs.existsSync(sessionsDir)) {
        return;
    }
    
    try {
        const channels = fs.readdirSync(sessionsDir);
        for (const ch of channels) {
            const channelPath = path.join(sessionsDir, ch);
            if (!fs.statSync(channelPath).isDirectory()) continue;
            
            const file = path.join(channelPath, 'storage-state.json');
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // 이미 암호화된 파일(MBENC1 헤더로 시작)인지 확인
            if (content.startsWith('MBENC1\n')) {
                continue;
            }
            
            // 평문 파일이면 암호화하여 덮어쓰기
            try {
                encryptToFile(file, content);
                console.log(`[Migration] Encrypted session for channel: ${ch}`);
            } catch (err) {
                console.error(`[Migration] Failed to encrypt session for ${ch}:`, err);
            }
        }
    } catch (err) {
        console.error('[Migration] Session migration error:', err);
    }
}
