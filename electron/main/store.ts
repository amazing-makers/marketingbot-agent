import Store from 'electron-store';
import { randomUUID } from 'crypto';

interface AppConfig {
    licenseKey?: string;
    apiUrl: string;
    machineId: string;
}

const store: any = new Store<AppConfig>({
    defaults: {
        apiUrl: 'http://localhost:3000',  // 개발 환경 기본값
        machineId: '',
    },
});

export function getLicenseKey(): string | undefined { 
    return store.get('licenseKey'); 
}

export function setLicenseKey(key: string) { 
    store.set('licenseKey', key); 
}

export function clearLicense() { 
    store.delete('licenseKey'); 
}

export function getApiUrl(): string { 
    return store.get('apiUrl'); 
}

export function getMachineId(): string {
    let id = store.get('machineId');
    if (!id) {
        id = randomUUID();
        store.set('machineId', id);
    }
    return id;
}
