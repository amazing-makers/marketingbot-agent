import { postToInstagram } from './adapters/instagram';
import { postToNaverBlog } from './adapters/naver-blog';
import { postToNaverCafe } from './adapters/naver-cafe';
import { postToFacebook } from './adapters/facebook';

interface Task {
    taskId: string;
    channelId: string;
    channelType: string;
    credentials: any;
    content: string;
    mediaUrls?: string[];
}

/**
 * 실제 작업 수행 엔진
 */
export async function runTask(task: Task): Promise<void> {
    console.log(`[Runner] ${task.channelType} 작업 시작 (ID: ${task.taskId})`);
    
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
        
        default:
            throw new Error(`지원하지 않는 채널 타입입니다: ${task.channelType} (Phase 5.5 예정)`);
    }
}
