import { ipcMain, BrowserWindow } from 'electron';
import { getLicenseKey, setLicenseKey, clearLicense, getMachineId, getApiUrl } from './store';
import { startPolling, stopPolling } from './poller';
import { checkForUpdatesManual, quitAndInstallNow } from './auto-update';

export function registerIpc(mainWindow: BrowserWindow) {
    ipcMain.handle('license:get', () => getLicenseKey());
    
    ipcMain.handle('license:set', (_, key: string) => {
        setLicenseKey(key);
        // 라이선스 설정 시 즉시 폴링 시작 및 UI에 상태 전송
        startPolling(status => {
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send('status:change', status);
            }
        });
        return true;
    });
    
    ipcMain.handle('license:clear', () => {
        clearLicense();
        stopPolling();
        return true;
    });
    
    ipcMain.handle('machine:id', () => getMachineId());
    ipcMain.handle('api:url', () => getApiUrl());

    // 자동 업데이트
    ipcMain.handle('update:check', () => checkForUpdatesManual());
    ipcMain.handle('update:quit-and-install', () => {
        quitAndInstallNow();
        return true;
    });
    
    // 앱 시작 시 라이선스가 있으면 자동 폴링 시작
    if (getLicenseKey()) {
        setTimeout(() => {
            startPolling(status => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('status:change', status);
                }
            });
        }, 1000); // 윈도우 로드 대기
    }
}
