import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// 템플릿 기본 API와 함께 커스텀 에이전트 API 노출
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      getLicense: () => ipcRenderer.invoke('license:get'),
      setLicense: (key: string) => ipcRenderer.invoke('license:set', key),
      clearLicense: () => ipcRenderer.invoke('license:clear'),
      onStatusChange: (cb: (status: string) => void) => {
        ipcRenderer.on('status:change', (_event, status) => cb(status));
      },
      getMachineId: () => ipcRenderer.invoke('machine:id'),
      getApiUrl: () => ipcRenderer.invoke('api:url'),
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in window)
  window.electron = {
    ...electronAPI,
    getLicense: () => ipcRenderer.invoke('license:get'),
    setLicense: (key: string) => ipcRenderer.invoke('license:set', key),
    clearLicense: () => ipcRenderer.invoke('license:clear'),
    onStatusChange: (cb: (status: string) => void) => {
      ipcRenderer.on('status:change', (_event, status) => cb(status));
    },
    getMachineId: () => ipcRenderer.invoke('machine:id'),
    getApiUrl: () => ipcRenderer.invoke('api:url'),
  };
}
