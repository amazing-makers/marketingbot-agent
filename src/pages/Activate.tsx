import { useState } from 'react';
import { Container, Paper, Title, Text, TextInput, Button, Stack, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconKey } from '@tabler/icons-react';

interface Props {
  onActivated: (key: string) => void;
}

export default function Activate({ onActivated }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) return;
    
    setLoading(true);
    try {
      const success = await window.electron.setLicense(key.trim());
      if (success) {
        notifications.show({
          title: '활성화 성공',
          message: '마케팅봇 에이전트가 성공적으로 활성화되었습니다.',
          color: 'green',
        });
        onActivated(key.trim());
      }
    } catch (err: any) {
      notifications.show({
        title: '활성화 실패',
        message: err.message || '라이선스 키를 확인해주세요.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ height: '100vh', backgroundColor: '#1A1B1E' }}>
      <Container size={420}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack align="center" mb={20}>
            <IconKey size={48} color="#228be6" />
            <Title order={2} ta="center">에이전트 활성화</Title>
            <Text c="dimmed" size="sm" ta="center">
              서비스 이용을 위해 발급받은 라이선스 키를 입력해주세요.
            </Text>
          </Stack>

          <TextInput
            label="라이선스 키"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            required
            value={key}
            onChange={(e) => setKey(e.currentTarget.value)}
          />

          <Button 
            fullWidth 
            mt="xl" 
            size="md" 
            onClick={handleActivate}
            loading={loading}
          >
            활성화하기
          </Button>
          
          <Text size="xs" c="dimmed" mt="md" ta="center">
            라이선스 키는 마케팅봇 대시보드에서 확인하실 수 있습니다.
          </Text>
        </Paper>
      </Container>
    </Center>
  );
}
