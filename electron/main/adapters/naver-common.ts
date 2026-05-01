import { Page, BrowserContext } from 'playwright';
import { humanDelay } from '../playwright/browser';
import { getSessionPath } from '../sessions';

/**
 * 네이버 계정별 세션 키 생성
 * 같은 아이디면 블로그와 카페가 세션을 공유하도록 설계
 */
export function getNaverSessionKey(credentials: any, channelId: string): string {
    const username = credentials.username || channelId;
    return `naver-${username}`;
}

/**
 * 네이버 로그인 상태 보장
 */
export async function ensureNaverLoggedIn(page: Page, context: BrowserContext, sessionKey: string): Promise<{ alreadyLoggedIn: boolean; needsManualLogin: boolean }> {
    await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
    await humanDelay(1500, 2500);
    
    // 로그인 지표 확인 (로그아웃 버튼이나 내 정보 버튼 유무)
    const loggedInIndicator = await page.$('a:has-text("로그아웃"), a.gnb_btn_login');
    // 실제 네이버 메인 UI 구조에 맞춰 체크 (a.gnb_btn_login이 없으면 로그인된 상태로 간주하는 로직 보강 가능)
    const isLoginButtonVisible = await page.$('a.gnb_btn_login, a:has-text("로그인")');
    
    if (!isLoginButtonVisible) {
        return { alreadyLoggedIn: true, needsManualLogin: false };
    }
    
    // 로그인 버튼 클릭
    await page.click('a.gnb_btn_login, a:has-text("로그인")');
    await humanDelay(1500, 2500);
    
    console.log(`[Naver] 수동 로그인 대기 중... (5분)`);
    
    try {
        // 로그인 완료 후 네이버 메인 또는 서비스 페이지로 돌아올 때까지 대기
        await page.waitForURL(url => 
            url.hostname === 'www.naver.com' || 
            url.hostname.endsWith('.naver.com'),
            { timeout: 300000 }
        );
        await humanDelay(2000, 3000);
        
        // 로그인 성공 시 세션 저장
        await context.storageState({ path: getSessionPath(sessionKey) });
        return { alreadyLoggedIn: false, needsManualLogin: true };
    } catch {
        throw new Error('네이버 수동 로그인 시간이 초과되었습니다.');
    }
}
