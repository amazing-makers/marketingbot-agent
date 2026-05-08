import { BrowserContext, Page } from 'playwright';
import { launchBrowserContext, humanDelay, humanType } from '../playwright/browser';
import { getSessionPath, saveEncryptedSession } from '../sessions';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';

interface InstagramTask {
    taskId: string;
    channelId: string;
    content: string;          // 캡션
    mediaUrls?: string[];     // 이미지 URL 1개
}

export async function postToInstagram(task: InstagramTask): Promise<{ success: boolean; error?: string }> {
    const { browser, context, isNewSession } = await launchBrowserContext(task.channelId, { headless: false });
    
    try {
        const page = await context.newPage();
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
        await humanDelay(2000, 4000);
        
        // 로그인 여부 확인
        const loginForm = await page.$('input[name="username"]');
        if (loginForm) {
            if (isNewSession) {
                console.log('[Instagram] 수동 로그인 필요. 브라우저에서 직접 로그인해주세요 (5분 대기)');
                try {
                    // 홈 피드(a[href="/"])가 보일 때까지 대기
                    await page.waitForSelector('a[href="/"]:not([role="button"])', { timeout: 300000 });
                    // 로그인 성공 시 세션 저장
                    await saveEncryptedSession(context, task.channelId);
                    console.log('[Instagram] 세션 저장 성공. 다음부턴 자동 진행됩니다.');
                } catch {
                    return { success: false, error: '수동 로그인 제한 시간 초과' };
                }
            } else {
                return { success: false, error: '세션이 만료되었습니다. 다시 로그인해주세요.' };
            }
        }
        
        // 이미지 다운로드
        if (!task.mediaUrls || task.mediaUrls.length === 0) {
            return { success: false, error: '인스타그램은 이미지가 필수입니다.' };
        }
        
        const tempImagePath = path.join(os.tmpdir(), `mb-${task.taskId}.jpg`);
        const imgRes = await axios.get(task.mediaUrls[0], { responseType: 'arraybuffer' });
        fs.writeFileSync(tempImagePath, Buffer.from(imgRes.data));
        
        // 게시 절차 시작
        await humanDelay(2000, 3000);
        
        // 새 게시물 버튼 클릭 (셀렉터는 환경에 따라 변할 수 있음)
        const newPostButton = await page.waitForSelector('svg[aria-label="새 게시물"], svg[aria-label="New post"]', { timeout: 10000 });
        await newPostButton.click();
        await humanDelay(1500, 2500);
        
        // 파일 업로드
        const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
        await fileInput.setInputFiles(tempImagePath);
        await humanDelay(4000, 6000);
        
        // "다음" 단계들 (이미지 편집/필터)
        for (let i = 0; i < 2; i++) {
            const nextButton = await page.waitForSelector('div[role="button"]:has-text("다음"), div[role="button"]:has-text("Next")', { timeout: 10000 });
            await nextButton.click();
            await humanDelay(2000, 3000);
        }
        
        // 캡션 입력
        const captionArea = await page.waitForSelector('div[aria-label="문구 입력..."], div[aria-label="Write a caption..."]', { timeout: 10000 });
        await captionArea.click();
        await page.keyboard.type(task.content);
        await humanDelay(1500, 2500);
        
        // "공유" 클릭
        const shareButton = await page.waitForSelector('div[role="button"]:has-text("공유하기"), div[role="button"]:has-text("Share")', { timeout: 10000 });
        await shareButton.click();
        
        // 완료 대기
        try {
            await page.waitForSelector('text=게시물이 공유되었습니다, text=Post shared', { timeout: 60000 });
        } catch {
            await page.waitForURL(url => url.pathname === '/' || url.pathname.includes('p/'), { timeout: 30000 });
        }
        
        if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
        return { success: true };
        
    } catch (err: any) {
        return { success: false, error: err.message || '인스타그램 자동화 중 알 수 없는 오류 발생' };
    } finally {
        await context.close();
        await browser.close();
    }
}

interface InstagramVerifyTask {
    channelId: string;
    accountName?: string;
    credentials?: { username?: string; password?: string };
}

/**
 * Phase 50 — 인스타그램 채널 인증 전용.
 *
 * 발행 없이 IG 홈에 접속해서 로그인 상태만 확인:
 *   - 이미 저장된 세션으로 자동 로그인되면 → 즉시 success (사용자 개입 X)
 *   - 로그인 폼이 보이면 → 사용자가 5분 안에 직접 로그인 (2FA 포함) → 세션 저장 → success
 *   - 5분 시간초과 → fail
 *
 * credentials.username/password 가 있으면 로그인 폼 username 필드에만 자동 채워서 hint 제공
 * (비번까지 자동 입력하면 IG 봇 감지 ↑ — 사용자가 직접 비번/2FA 입력하도록).
 */
export async function verifyInstagram(task: InstagramVerifyTask): Promise<{ success: boolean; error?: string }> {
    const { browser, context } = await launchBrowserContext(task.channelId, { headless: false });

    try {
        const page = await context.newPage();
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
        await humanDelay(1500, 3000);

        const loginForm = await page.$('input[name="username"]');
        if (!loginForm) {
            // 이미 로그인된 세션 — 그대로 사용
            await saveEncryptedSession(context, task.channelId);
            return { success: true };
        }

        // 로그인 폼 노출 → 사용자에게 직접 로그인 요청 (5분 대기)
        if (task.credentials?.username) {
            try {
                await humanType(loginForm, task.credentials.username);
            } catch {
                // 자동 입력 실패해도 무시 (사용자가 직접 입력)
            }
        }
        console.log('[Instagram VERIFY] 로그인 창에서 직접 로그인해주세요 (5분 대기)');
        try {
            await page.waitForSelector('a[href="/"]:not([role="button"])', { timeout: 300000 });
            await saveEncryptedSession(context, task.channelId);
            console.log('[Instagram VERIFY] 인증 성공 — 세션 저장 완료');
            return { success: true };
        } catch {
            return { success: false, error: '로그인 시간 초과 (5분)' };
        }
    } catch (err: any) {
        return { success: false, error: err.message || '인스타그램 인증 중 오류' };
    } finally {
        await context.close();
        await browser.close();
    }
}
