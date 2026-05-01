import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

const agentApi = {
  ...electronAPI,
  getLicense: () => ipcRenderer.invoke('license:get'),
  setLicense: (key: string) => ipcRenderer.invoke('license:set', key),
  clearLicense: () => ipcRenderer.invoke('license:clear'),
  onStatusChange: (cb: (status: string) => void) => {
    ipcRenderer.on('status:change', (_event, status) => cb(status));
  },
  getMachineId: () => ipcRenderer.invoke('machine:id'),
  getApiUrl: () => ipcRenderer.invoke('api:url'),

  // 자동 업데이트
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('update:quit-and-install'),
  onUpdateStatus: (cb: (data: { status: string; version?: string; message?: string }) => void) => {
    ipcRenderer.on('update:status', (_event, data) => cb(data));
  },
  onUpdateProgress: (cb: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    ipcRenderer.on('update:progress', (_event, data) => cb(data));
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', agentApi);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in window)
  window.electron = agentApi;
}
