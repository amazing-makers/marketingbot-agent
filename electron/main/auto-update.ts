import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog, Notification } from 'electron';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

let mainWindow: BrowserWindow | null = null;

export function setupAutoUpdate(window: BrowserWindow) {
    mainWindow = window;

    if (!app.isPackaged) {
        console.log('[AutoUpdate] Skipped in dev mode');
        return;
    }

    autoUpdater.on('checking-for-update', () => {
        console.log('[AutoUpdate] Checking for updates...');
        mainWindow?.webContents.send('update:status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
        console.log('[AutoUpdate] Update available:', info.version);
        mainWindow?.webContents.send('update:status', {
            status: 'downloading',
            version: info.version,
            releaseNotes: info.releaseNotes,
        });
    });

    autoUpdater.on('update-not-available', () => {
        mainWindow?.webContents.send('update:status', { status: 'up-to-date' });
    });

    autoUpdater.on('download-progress', (progress) => {
        mainWindow?.webContents.send('update:progress', {
            percent: Math.round(progress.percent),
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total,
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('[AutoUpdate] Update downloaded:', info.version);
        mainWindow?.webContents.send('update:status', {
            status: 'ready',
            version: info.version,
        });

        try {
            new Notification({
                title: '마케팅봇 업데이트 준비 완료',
                body: `v${info.version} 업데이트 준비. 다음 시작 시 자동 적용됩니다.`,
            }).show();
        } catch (err) {
            console.warn('[AutoUpdate] Notification failed:', err);
        }

        if (mainWindow) {
            dialog
                .showMessageBox(mainWindow, {
                    type: 'info',
                    title: '업데이트 준비 완료',
                    message: `마케팅봇 v${info.version} 이 다운로드되었습니다.`,
                    detail: '지금 재시작하여 적용하시겠습니까?\n(취소하면 다음 시작 시 자동 적용됩니다)',
                    buttons: ['지금 재시작', '나중에'],
                    defaultId: 0,
                    cancelId: 1,
                })
                .then((result) => {
                    if (result.response === 0) {
                        autoUpdater.quitAndInstall();
                    }
                });
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('[AutoUpdate] Error:', err);
        mainWindow?.webContents.send('update:status', {
            status: 'error',
            message: err.message,
        });
    });

    // 시작 시 1회 + 6시간마다 체크
    autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdate] Initial check failed:', err.message);
    });

    setInterval(
        () => {
            autoUpdater.checkForUpdates().catch((err) => {
                console.warn('[AutoUpdate] Periodic check failed:', err.message);
            });
        },
        6 * 60 * 60 * 1000
    );
}

export async function checkForUpdatesManual(): Promise<{
    hasUpdate: boolean;
    version?: string;
    error?: string;
}> {
    if (!app.isPackaged) {
        return { hasUpdate: false, error: 'Dev mode (auto-update disabled)' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        if (!result || !result.updateInfo) return { hasUpdate: false };
        const hasUpdate = result.updateInfo.version !== app.getVersion();
        return {
            hasUpdate,
            version: result.updateInfo.version,
        };
    } catch (err: any) {
        console.error('[AutoUpdate] Manual check failed:', err);
        return { hasUpdate: false, error: err.message };
    }
}

export function quitAndInstallNow(): void {
    if (app.isPackaged) {
        autoUpdater.quitAndInstall();
    }
}
