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
