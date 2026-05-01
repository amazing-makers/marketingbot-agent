/// <reference types="vite/client" />

interface Window {
  electron: {
    getLicense: () => Promise<string | null>;
    setLicense: (key: string) => Promise<boolean>;
    clearLicense: () => Promise<boolean>;
    onStatusChange: (cb: (status: string) => void) => void;
    getMachineId: () => Promise<string>;
    getApiUrl: () => Promise<string>;
    ipcRenderer: import('electron').IpcRenderer;
  };
  ipcRenderer: import('electron').IpcRenderer; // 보일러플레이트 예제용
}
