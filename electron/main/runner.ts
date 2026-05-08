import { postToInstagram, verifyInstagram, openInstagramInBrowser } from './adapters/instagram';
import { postToNaverBlog } from './adapters/naver-blog';
import { postToNaverCafe } from './adapters/naver-cafe';
import { postToFacebook } from './adapters/facebook';
import { postToThreads } from './adapters/threads';

interface Task {
    taskId: string;
    channelId: string;
    channelType: string;
    credentials: any;
    content: string;
    mediaUrls?: string[];
}

interface VerifyTask {
    taskId: string;
    channelId: string;
    channelType: string;
    accountName?: string;
    credentials?: any;
    kind?: 'VERIFY' | 'OPEN_BROWSER';
}

// 채널별 in-process lock — 같은 채널은 동시 1개 task 만 실행
const channelLocks = new Map<string, Promise<void>>();

async function withChannelLock<T>(channelId: string, fn: () => Promise<T>): Promise<T> {
    const existing = channelLocks.get(channelId);
    if (existing) {
        console.log(`[Runner] Channel ${channelId} busy — 대기 중...`);
        await existing.catch(() => {}); // 이전 작업 결과는 무시 (실패해도 다음 진행)
    }

    let release: () => void = () => {};
    const lock = new Promise<void>((resolve) => { release = resolve; });
    channelLocks.set(channelId, lock);

    try {
        return await fn();
    } finally {
        release();
        // 자기 lock 만 정리 (다른 task 가 덮어쓴 경우 보호)
        if (channelLocks.get(channelId) === lock) {
            channelLocks.delete(channelId);
        }
    }
}

/**
 * 실제 작업 수행 엔진
 * 같은 channelId 작업은 자동 직렬화 (in-process lock).
 */
export async function runTask(task: Task): Promise<void> {
    return withChannelLock(task.channelId, async () => {
        console.log(`[Runner] ${task.channelType} 작업 시작 (ID: ${task.taskId})`);
        return runTaskInner(task);
    });
}

async function runTaskInner(task: Task): Promise<void> {
    switch (task.channelType) {
        case 'INSTAGRAM': {
            const result = await postToInstagram({
                taskId: task.taskId,
                channelId: task.channelId,
                content: task.content,
                mediaUrls: task.mediaUrls,
            });
            
            if (!result.success) throw new Error(result.error);
            return;
        }

        case 'NAVER_BLOG': {
            const result = await postToNaverBlog({
                taskId: task.taskId,
                channelId: task.channelId,
                credentials: task.credentials,
                content: task.content,
                mediaUrls: task.mediaUrls,
            });
            if (!result.success) throw new Error(result.error);
            return;
        }

        case 'NAVER_CAFE': {
            const result = await postToNaverCafe({
                taskId: task.taskId,
                channelId: task.channelId,
                credentials: task.credentials,
                content: task.content,
                mediaUrls: task.mediaUrls,
            });
            if (!result.success) throw new Error(result.error);
            return;
        }

        case 'FACEBOOK': {
            const result = await postToFacebook({
                taskId: task.taskId,
                channelId: task.channelId,
                credentials: task.credentials,
                content: task.content,
                mediaUrls: task.mediaUrls,
            });
            if (!result.success) throw new Error(result.error);
            return;
        }

        case 'THREADS': {
            const result = await postToThreads({
                taskId: task.taskId,
                channelId: task.channelId,
                credentials: task.credentials,
                content: task.content,
                mediaUrls: task.mediaUrls,
            });
            if (!result.success) throw new Error(result.error);
            return;
        }
        
        default:
            throw new Error(`지원하지 않는 채널 타입입니다: ${task.channelType} (Phase 5.5.1 예정)`);
    }
}

/**
 * Phase 50 — 채널 인증 (verify) 전용 작업.
 *
 * 발행과 달리 content/mediaUrls 없음. 브라우저를 띄워 사용자가 직접 로그인하도록 하고
 * 세션이 정상 저장되면 SUCCESS, 시간초과/실패면 throw 해서 FAILED 처리.
 *
 * 같은 채널의 발행 task 와 lock 을 공유하므로 verify 가 진행 중이면 발행이 대기,
 * 발행이 진행 중이면 verify 가 대기 (같은 브라우저 세션 충돌 방지).
 */
export async function runVerifyTask(task: VerifyTask): Promise<void> {
    return withChannelLock(task.channelId, async () => {
        const kind = task.kind || 'VERIFY';
        console.log(`[Runner] ${kind} ${task.channelType} (channelId: ${task.channelId})`);

        if (kind === 'OPEN_BROWSER') {
            // Phase 50 — 사용자가 채널 카드 클릭 → 저장된 세션으로 SNS 본인 페이지 노출.
            switch (task.channelType) {
                case 'INSTAGRAM': {
                    const r = await openInstagramInBrowser({
                        channelId: task.channelId,
                        accountName: task.accountName,
                    });
                    if (!r.success) throw new Error(r.error || '인스타그램 브라우저 열기 실패');
                    return;
                }
                default:
                    throw new Error(`아직 브라우저 열기를 지원하지 않는 채널입니다: ${task.channelType}`);
            }
        }

        // kind === 'VERIFY'
        switch (task.channelType) {
            case 'INSTAGRAM': {
                const r = await verifyInstagram({
                    channelId: task.channelId,
                    accountName: task.accountName,
                    credentials: task.credentials,
                });
                if (!r.success) throw new Error(r.error || '인스타그램 인증 실패');
                return;
            }
            default:
                throw new Error(`아직 인증을 지원하지 않는 채널입니다: ${task.channelType}`);
        }
    });
}
