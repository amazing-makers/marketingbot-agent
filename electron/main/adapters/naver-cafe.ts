import { launchBrowserContext, humanDelay } from '../playwright/browser';
import { getNaverSessionKey, ensureNaverLoggedIn } from './naver-common';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';

interface CafeTask {
    taskId: string;
    channelId: string;
    credentials: { 
        username: string; 
        password: string;
        cafeId: string;
        menuId: string;
    };
    content: string;
    title?: string;
    mediaUrls?: string[];
}

export async function postToNaverCafe(task: CafeTask): Promise<{ success: boolean; error?: string }> {
    const sessionKey = getNaverSessionKey(task.credentials, task.channelId);
    const { browser, context } = await launchBrowserContext(sessionKey, { headless: false });
    
    try {
        const page = await context.newPage();
        await ensureNaverLoggedIn(page, context, sessionKey);
        
        // 카페 글쓰기 페이지 직접 이동
        const writeUrl = `https://cafe.naver.com/ca-fe/cafes/${task.credentials.cafeId}/articles/write?boardType=L&menuId=${task.credentials.menuId}`;
        await page.goto(writeUrl, { waitUntil: 'domcontentloaded' });
        await humanDelay(3000, 5000);
        
        // 권한 체크
        const accessError = await page.$('text=/가입.*없|권한.*없|잘못된/');
        if (accessError) {
            throw new Error('카페 가입 정보가 없거나 글쓰기 권한이 없습니다.');
        }
        
        const lines = task.content.split('\n');
        const title = task.title || lines[0] || '카페 새 글';
        const body = task.title ? task.content : lines.slice(1).join('\n').trim();
        
        // 제목 입력 (iframe 밖)
        await page.fill('input[name="subject"], .input_title, input[placeholder*="제목"]', title);
        await humanDelay(1000, 2000);
        
        // 에디터 iframe 진입 (카페는 여러 종류의 에디터를 사용할 수 있으나 보통 se2_iframe 등 사용)
        const editorFrame = page.frameLocator('iframe.se2_inputarea, iframe#se2_iframe, iframe[id*="editor"]');
        
        // 본문 영역 클릭 후 입력
        await editorFrame.locator('body, .se-section-text [contenteditable]').first().click();
        await humanDelay(500, 1000);
        await page.keyboard.type(body, { delay: 40 });
        await humanDelay(1500, 2500);
        
        // 이미지 첨부
        if (task.mediaUrls && task.mediaUrls.length > 0) {
            const tempPath = path.join(os.tmpdir(), `mb-cafe-${task.taskId}.jpg`);
            const res = await axios.get(task.mediaUrls[0], { responseType: 'arraybuffer' });
            fs.writeFileSync(tempPath, Buffer.from(res.data));
            
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.setInputFiles(tempPath);
                await humanDelay(4000, 6000);
            }
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        
        // 등록 버튼 클릭
        await page.click('button:has-text("등록"), .btn_register, button.write_btn');
        
        // 완료 확인 (아티클 읽기 페이지로 이동 대기)
        await page.waitForURL(url => 
            url.pathname.includes('/articles/') || url.pathname.includes('ArticleRead'),
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
