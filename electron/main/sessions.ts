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

/**
 * 세션 삭제 (로그아웃 등)
 */
export function deleteSession(channelId: string): void {
    const file = getSessionPath(channelId);
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
}
