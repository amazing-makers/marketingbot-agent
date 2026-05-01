import axios from 'axios';
import { getLicenseKey, getApiUrl, getMachineId } from './store';
import { runTask } from './runner';
import { app } from 'electron';
import * as os from 'os';

const POLL_INTERVAL_MS = 60 * 1000; // 1분
let pollTimer: NodeJS.Timeout | null = null;
let isRunning = false;

export function startPolling(onStatusChange: (status: string) => void) {
    if (pollTimer) return;
    
    const tick = async () => {
        if (isRunning) return; // 이전 작업이 아직 진행 중이면 스킵
        
        const licenseKey = getLicenseKey();
        if (!licenseKey) {
            onStatusChange('NOT_AUTHENTICATED');
            return;
        }
        
        isRunning = true;
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(
                `${apiUrl}/api/agent/poll`,
                {
                    machineId: getMachineId(),
                    version: app.getVersion(),
                    os: `${os.platform()} ${os.release()}`,
                },
                { 
                    headers: { Authorization: `Bearer ${licenseKey}` }, 
                    timeout: 30000 
                }
            );
            
            const tasks = res.data.tasks || [];
            onStatusChange(`POLLING_OK (${tasks.length} tasks)`);
            
            for (const task of tasks) {
                try {
                    onStatusChange(`RUNNING ${task.taskId}`);
                    await runTask(task);
                    await reportResult(licenseKey, task.taskId, 'SUCCESS');
                } catch (err: any) {
                    await reportResult(licenseKey, task.taskId, 'FAILED', err.message);
                }
            }
        } catch (err: any) {
            onStatusChange(`POLL_ERROR: ${err.message}`);
        } finally {
            isRunning = false;
        }
    };
    
    tick(); // 즉시 첫 실행
    pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

export function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

async function reportResult(licenseKey: string, taskId: string, status: 'SUCCESS' | 'FAILED', errorLog?: string) {
    try {
        const apiUrl = getApiUrl();
        await axios.post(
            `${apiUrl}/api/agent/result`,
            { taskId, status, executedAt: new Date().toISOString(), errorLog },
            { 
                headers: { Authorization: `Bearer ${licenseKey}` }, 
                timeout: 10000 
            }
        );
    } catch (err) {
        console.error('Failed to report result:', err);
    }
}
