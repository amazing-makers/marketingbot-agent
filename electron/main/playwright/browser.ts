import { chromium as playwrightExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, BrowserContext } from 'playwright';
import { hasSession, getSessionPath } from '../sessions';

// Stealth 플러그인 등록
playwrightExtra.use(StealthPlugin());

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { decryptFromFile } from '../crypto/storage-encrypt';

/**
 * 브라우저 및 컨텍스트 초기화
 */
export async function launchBrowserContext(channelId: string, opts: { headless?: boolean } = {}): Promise<{ browser: Browser; context: BrowserContext; isNewSession: boolean }> {
    const browser = await playwrightExtra.launch({
        headless: opts.headless ?? false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
    });
    
    const sessionFile = getSessionPath(channelId);
    const sessionExists = fs.existsSync(sessionFile);
    
    let storageStateOption = undefined;
    let tempStateFile: string | null = null;
    
    if (sessionExists) {
        try {
            // 암호화된 파일 복호화 -> 임시 파일 저장
            const decrypted = decryptFromFile(sessionFile);
            tempStateFile = path.join(os.tmpdir(), `mb-state-${channelId}-${Date.now()}.json`);
            fs.writeFileSync(tempStateFile, decrypted, 'utf8');
            storageStateOption = tempStateFile;
        } catch (err) {
            console.warn(`[Browser] Session decrypt failed for ${channelId}, treating as new session:`, err);
        }
    }
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: USER_AGENTS[0],
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        // 임시 복호화 파일이 있으면 로드
        storageState: storageStateOption,
    });
    
    // Playwright가 메모리에 로드했으므로 임시 파일 즉시 삭제
    if (tempStateFile && fs.existsSync(tempStateFile)) {
        try {
            fs.unlinkSync(tempStateFile);
        } catch (e) {
            console.error('[Browser] Failed to cleanup temp session file:', e);
        }
    }
    
    return { browser, context, isNewSession: !sessionExists };
}

/**
 * 임의의 지연 시간 부여 (인간적인 행동 모사)
 */
export function humanDelay(min: number = 500, max: number = 1500): Promise<void> {
    const ms = min + Math.random() * (max - min);
    return new Promise(r => setTimeout(r, ms));
}

/**
 * 인간적인 타이핑 행동 모사
 */
export async function humanType(page: any, selector: string, text: string): Promise<void> {
    await page.click(selector);
    for (const ch of text) {
        await page.keyboard.type(ch);
        await humanDelay(50, 150); // 글자 간 랜덤 간격
    }
}
