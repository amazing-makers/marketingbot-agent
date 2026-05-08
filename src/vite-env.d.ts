/// <reference types="vite/client" />

interface Window {
  electron: {
    getAppVersion?: () => Promise<string>;
    getLicense: () => Promise<string | null>;
    setLicense: (key: string) => Promise<boolean>;
    clearLicense: () => Promise<boolean>;
    onStatusChange: (cb: (status: string) => void) => void;
    getMachineId: () => Promise<string>;
    getApiUrl: () => Promise<string>;
    // 자동 업데이트
    checkForUpdates?: () => Promise<{ hasUpdate: boolean; version?: string; error?: string }>;
    quitAndInstallUpdate?: () => Promise<boolean>;
    onUpdateStatus?: (cb: (data: { status: string; version?: string; message?: string; releaseNotes?: string }) => void) => void;
    onUpdateProgress?: (cb: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => void;
    ipcRenderer: import('electron').IpcRenderer;
  };
  ipcRenderer: import('electron').IpcRenderer; // 보일러플레이트 예제용
}
