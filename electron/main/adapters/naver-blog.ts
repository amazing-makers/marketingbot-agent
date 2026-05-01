import { launchBrowserContext, humanDelay } from '../playwright/browser';
import { getNaverSessionKey, ensureNaverLoggedIn } from './naver-common';
import { getSessionPath } from '../sessions';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';

interface BlogTask {
    taskId: string;
    channelId: string;
    credentials: { username: string; password: string };
    content: string;
    title?: string;
    mediaUrls?: string[];
}

export async function postToNaverBlog(task: BlogTask): Promise<{ success: boolean; error?: string }> {
    const sessionKey = getNaverSessionKey(task.credentials, task.channelId);
    const { browser, context } = await launchBrowserContext(sessionKey, { headless: false });
    
    try {
        const page = await context.newPage();
        await ensureNaverLoggedIn(page, context, sessionKey);
        
        // 글쓰기 페이지 이동
        await page.goto('https://blog.naver.com/GoBlogWrite.naver', { waitUntil: 'domcontentloaded' });
        await humanDelay(3000, 5000);
        
        // 에디터 iframe 진입
        const editorFrame = page.frameLocator('iframe#mainFrame');
        
        // 데이터 파싱 (제목/본문)
        const lines = task.content.split('\n');
        const title = task.title || lines[0] || '새로운 포스트';
        const body = task.title ? task.content : lines.slice(1).join('\n').trim();
        
        // 제목 입력 (플레이스홀더 클릭 후 입력)
        const titleSelector = 'span.se-placeholder, .se-section-documentTitle [contenteditable]';
        await editorFrame.locator(titleSelector).first().click();
        await humanDelay(500, 1000);
        await page.keyboard.type(title, { delay: 50 });
        
        // 본문 입력
        const bodySelector = '.se-section-text [contenteditable], .se-content';
        await editorFrame.locator(bodySelector).first().click();
        await humanDelay(1000, 2000);
        await page.keyboard.type(body, { delay: 30 });
        
        // 이미지 첨부
        if (task.mediaUrls && task.mediaUrls.length > 0) {
            const tempPath = path.join(os.tmpdir(), `mb-blog-${task.taskId}.jpg`);
            const res = await axios.get(task.mediaUrls[0], { responseType: 'arraybuffer' });
            fs.writeFileSync(tempPath, Buffer.from(res.data));
            
            // 사진 버튼 클릭
            await editorFrame.locator('button[aria-label*="사진"], .se-image-toolbar-button').first().click();
            await humanDelay(1000, 2000);
            
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.setInputFiles(tempPath);
                await humanDelay(4000, 6000); // 업로드 대기
            }
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        
        // 발행 절차
        await editorFrame.locator('button:has-text("발행")').first().click();
        await humanDelay(1500, 2500);
        
        // 최종 발행 버튼 (팝업 내)
        const finalBtn = await editorFrame.locator('button.publish_btn, button:has-text("발행")').last();
        await finalBtn.click();
        
        // 완료 확인
        await page.waitForURL(url => 
            url.pathname.includes('/PostView') || 
            url.pathname.includes('/post/') ||
            url.pathname.includes(task.credentials.username),
            { timeout: 60000 }
        );
        
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || String(err) };
    } finally {
        await context.close();
        await browser.close();
    }
}
