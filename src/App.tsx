import { useState, useEffect } from 'react';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';

function App() {
  const [license, setLicense] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    // 앱 시작 시 라이선스 정보 가져오기 — Promise reject 시에도 loading 해제 (빈 화면 방지).
    if (window.electron && window.electron.getLicense) {
      window.electron.getLicense()
        .then((key: string | null) => setLicense(key))
        .catch((err: any) => {
          console.error('[App] getLicense failed:', err);
          setBootError(err?.message || 'getLicense IPC 호출 실패');
        })
        .finally(() => setLoading(false));
    } else {
      console.warn('[App] window.electron.getLicense unavailable — preload 가 로드되지 않았을 가능성');
      setBootError('preload 가 로드되지 않았습니다 (window.electron 없음)');
      setLoading(false);
    }
  }, []);

  if (loading) {
    // 빈 null 대신 명시적 로딩 — DevTools 가 안 열려도 화면이 흰 상태가 아닌 상태임을 사용자에게 표시.
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#666' }}>
        ⏳ 마케팅봇 에이전트 시작 중...
      </div>
    );
  }

  if (bootError) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#c92a2a' }}>⚠️ 부팅 오류</h2>
        <p style={{ color: '#666' }}>{bootError}</p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
          메뉴 <code>View → Toggle Developer Tools</code> (또는 <code>Ctrl+Shift+I</code>) 를 열어
          Console 탭의 에러 메시지를 캡처해 알려주세요.
        </p>
      </div>
    );
  }

  if (!license) {
    return <Activate onActivated={(key) => setLicense(key)} />;
  }

  return <Dashboard license={license} onDeactivated={() => setLicense(null)} />;
}

export default App;