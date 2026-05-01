import { useState, useEffect } from 'react';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';

function App() {
  const [license, setLicense] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 앱 시작 시 라이선스 정보 가져오기
    if (window.electron && window.electron.getLicense) {
      window.electron.getLicense().then((key: string | null) => {
        setLicense(key);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return null;
  }

  if (!license) {
    return <Activate onActivated={(key) => setLicense(key)} />;
  }

  return <Dashboard license={license} onDeactivated={() => setLicense(null)} />;
}

export default App;