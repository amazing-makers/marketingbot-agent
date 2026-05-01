import { launchBrowserContext, humanDelay } from '../playwright/browser';
import { getSessionPath, saveEncryptedSession } from '../sessions';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';

interface ThreadsTask {
    taskId: string;
    channelId: string;
    credentials: { username: string; password: string };
    content: string;
    mediaUrls?: string[];
}

export async function postToThreads(task: ThreadsTask): Promise<{ success: boolean; error?: string }> {
    const { browser, context, isNewSession } = await launchBrowserContext(task.channelId, { headless: false });
    
    try {
        const page = await context.newPage();
        await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded' });
        await humanDelay(2000, 4000);
        
        // 로그인 체크
        const loginButton = await page.$('a:has-text("로그인"), a:has-text("Log in"), button:has-text("Instagram으로 로그인"), button:has-text("Continue with Instagram")');
        if (loginButton) {
            if (!isNewSession) {
                return { success: false, error: 'Threads 세션 만료 — 다시 로그인 필요' };
            }
            console.log('[Threads] 수동 로그인 필요. 5분 내 Instagram 계정으로 로그인해주세요.');
            try {
                // 로그인 완료 시 메인 피드 진입 확인
                await page.waitForSelector('div[role="textbox"], svg[aria-label="새 게시물"], svg[aria-label="New thread"]', { timeout: 300000 });
                await saveEncryptedSession(context, task.channelId);
                console.log('[Threads] 세션 저장 성공.');
            } catch {
                return { success: false, error: '수동 로그인 시간 초과' };
            }
        }
        
        await humanDelay(2000, 3000);
        
        // 글쓰기 창 열기
        let textbox = await page.$('div[role="textbox"][contenteditable="true"]');
        if (!textbox) {
            const composeTrigger = await page.$('text=스레드 시작, text=Start a thread, svg[aria-label="새 게시물"], svg[aria-label="New thread"]');
            if (composeTrigger) {
                await composeTrigger.click();
                await humanDelay(1000, 2000);
                textbox = await page.waitForSelector('div[role="textbox"][contenteditable="true"]', { timeout: 5000 });
            }
        }
        
        if (!textbox) throw new Error('Threads 글쓰기 영역을 찾을 수 없습니다.');
        
        // 내용 입력
        await textbox.click();
        await humanDelay(500, 1000);
        await page.keyboard.type(task.content, { delay: 60 });
        await humanDelay(1500, 2500);
        
        // 이미지 첨부
        if (task.mediaUrls && task.mediaUrls.length > 0) {
            const tempImg = path.join(os.tmpdir(), `mb-threads-${task.taskId}.jpg`);
            const res = await axios.get(task.mediaUrls[0], { responseType: 'arraybuffer' });
            fs.writeFileSync(tempImg, Buffer.from(res.data));
            
            const attachBtn = await page.$('svg[aria-label="첨부"], svg[aria-label="Attach media"], button[aria-label*="사진"]');
            if (attachBtn) {
                await attachBtn.click();
                await humanDelay(1000, 2000);
                const fileInput = await page.$('input[type="file"]');
                if (fileInput) await fileInput.setInputFiles(tempImg);
                await humanDelay(3000, 5000);
            }
            if (fs.existsSync(tempImg)) fs.unlinkSync(tempImg);
        }
        
        // 게시 버튼
        const postButton = await page.waitForSelector('div[role="button"]:has-text("게시"), div[role="button"]:has-text("Post"), button:has-text("게시")', { timeout: 10000 });
        await postButton.click();
        
        // 완료 대기
        await Promise.race([
            page.waitForSelector('div[role="textbox"][contenteditable="true"]', { state: 'hidden', timeout: 30000 }),
            page.waitForSelector('text=게시되었습니다, text=Posted', { timeout: 30000 }),
        ]);
        
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || String(err) };
    } finally {
        await context.close();
        await browser.close();
    }
}
