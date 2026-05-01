import { launchBrowserContext, humanDelay, humanType } from '../playwright/browser';
import { getSessionPath } from '../sessions';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';

interface FacebookTask {
    taskId: string;
    channelId: string;
    credentials: { username: string; password: string; pageId?: string };
    content: string;
    mediaUrls?: string[];
}

export async function postToFacebook(task: FacebookTask): Promise<{ success: boolean; error?: string }> {
    const { browser, context, isNewSession } = await launchBrowserContext(task.channelId, { headless: false });
    
    try {
        const page = await context.newPage();
        await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
        await humanDelay(2000, 4000);
        
        // 로그인 체크
        const loginForm = await page.$('input[name="email"]');
        if (loginForm) {
            if (!isNewSession) {
                return { success: false, error: '세션 만료 — 채널 설정에서 재로그인 필요' };
            }
            console.log('[Facebook] 수동 로그인 필요. 5분 내 완료 후 홈 피드 진입.');
            try {
                // 로그인 완료 시 홈 피드의 글쓰기 영역이 나타날 때까지 대기
                await page.waitForSelector('div[role="button"]:has-text("무슨 생각"), div[role="button"]:has-text("What\'s on your mind")', { timeout: 300000 });
                await context.storageState({ path: getSessionPath(task.channelId) });
                console.log('[Facebook] 세션 저장 완료.');
            } catch {
                return { success: false, error: '수동 로그인 시간 초과' };
            }
        }
        
        // 페이지 게시 시 해당 페이지로 이동
        if (task.credentials.pageId) {
            await page.goto(`https://www.facebook.com/${task.credentials.pageId}/`, { waitUntil: 'domcontentloaded' });
            await humanDelay(3000, 5000);
        }
        
        // 글쓰기 영역 버튼 클릭
        const composeButton = await page.waitForSelector('div[role="button"]:has-text("무슨 생각"), div[role="button"]:has-text("What\'s on your mind"), div[role="button"]:has-text("게시물 작성")', { timeout: 15000 });
        await composeButton.click();
        await humanDelay(2000, 3000);
        
        // 에디터 모달 진입 및 텍스트 입력
        const editorArea = await page.waitForSelector('div[contenteditable="true"][role="textbox"]', { timeout: 10000 });
        await editorArea.click();
        await humanDelay(1000, 1500);
        await page.keyboard.type(task.content, { delay: 60 });
        await humanDelay(1500, 2500);
        
        // 이미지 첨부
        if (task.mediaUrls && task.mediaUrls.length > 0) {
            const tempImg = path.join(os.tmpdir(), `mb-fb-${task.taskId}.jpg`);
            const imgRes = await axios.get(task.mediaUrls[0], { responseType: 'arraybuffer' });
            fs.writeFileSync(tempImg, Buffer.from(imgRes.data));
            
            // 사진/동영상 추가 버튼 클릭
            await page.click('div[aria-label="사진/동영상"], div[aria-label="Photo/video"]');
            await humanDelay(1500, 2500);
            
            const fileInput = await page.waitForSelector('input[type="file"][accept*="image"]', { timeout: 10000 });
            await fileInput.setInputFiles(tempImg);
            await humanDelay(4000, 6000); // 업로드 대기
            
            if (fs.existsSync(tempImg)) fs.unlinkSync(tempImg);
        }
        
        // 게시 버튼 클릭
        const publishButton = await page.waitForSelector('div[aria-label="게시"][role="button"], div[aria-label="Post"][role="button"], button:has-text("게시")', { timeout: 10000 });
        await publishButton.click();
        
        // 게시 완료 확인 (글쓰기 모달이 사라질 때까지 대기)
        await page.waitForSelector('div[contenteditable="true"][role="textbox"]', { state: 'hidden', timeout: 60000 });
        
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || String(err) };
    } finally {
        await context.close();
        await browser.close();
    }
}
