import { useState, useEffect } from 'react';
import { 
  Container, Paper, Title, Text, Button, Group, Badge, 
  Stack, ScrollArea, Divider, ActionIcon, Tooltip, Box 
} from '@mantine/core';
import { IconLogout, IconRefresh, IconCircleCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';

interface Props {
  license: string;
  onDeactivated: () => void;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function Dashboard({ license, onDeactivated }: Props) {
  const [status, setStatus] = useState('CONNECTING...');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [machineId, setMachineId] = useState('');

  useEffect(() => {
    window.electron.getMachineId().then(setMachineId);

    window.electron.onStatusChange((newStatus: string) => {
      setStatus(newStatus);
      addLog(newStatus);
    });

    addLog('에이전트가 시작되었습니다.');
  }, []);

  const addLog = (message: string) => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      message,
      type: message.includes('ERROR') ? 'error' : message.includes('OK') ? 'success' : 'info'
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  const handleDeactivate = async () => {
    if (confirm('라이선스를 비활성화하고 로그아웃 하시겠습니까?')) {
      await window.electron.clearLicense();
      onDeactivated();
    }
  };

  const getStatusBadge = () => {
    if (status.includes('POLLING_OK')) return <Badge color="green" variant="light">정상 작동 중</Badge>;
    if (status.includes('RUNNING')) return <Badge color="blue" variant="filled" leftSection={<IconLoader2 size={12} className="spinning" />}>작업 수행 중</Badge>;
    if (status.includes('ERROR')) return <Badge color="red" variant="light">오류 발생</Badge>;
    return <Badge color="gray" variant="light">{status}</Badge>;
  };

  return (
    <Container size="md" py="xl">
      <Paper withBorder p="md" radius="md" mb="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={4}>MarketingBot Agent</Title>
            <Text size="xs" c="dimmed">Machine ID: {machineId}</Text>
          </Stack>
          <Group>
            <Tooltip label={`License: ${license.substring(0, 8)}...`}>
              <Badge variant="outline" color="blue">Active License</Badge>
            </Tooltip>
            <ActionIcon variant="light" color="red" onClick={handleDeactivate} title="로그아웃">
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      <Group grow align="stretch">
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">현재 상태</Text>
            <Group>
              {getStatusBadge()}
              <Text size="xs" c="dimmed">Last update: {new Date().toLocaleTimeString()}</Text>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">서버 연결</Text>
            <Text size="sm" fw={700}>Connected to Cloud</Text>
          </Stack>
        </Paper>
      </Group>

      <Paper withBorder p="md" radius="md" mt="md">
        <Group justify="space-between" mb="xs">
          <Title order={5}>실시간 작업 로그</Title>
          <IconRefresh size={16} color="gray" style={{ cursor: 'pointer' }} onClick={() => addLog('새로고침되었습니다.')} />
        </Group>
        <Divider mb="sm" />
        <ScrollArea h={300} offsetScrollbars>
          <Stack gap={5}>
            {logs.map((log, i) => (
              <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
                <Text size="xs" c="dimmed" style={{ minWidth: 70 }}>[{log.time}]</Text>
                {log.type === 'success' && <IconCircleCheck size={14} color="green" />}
                {log.type === 'error' && <IconAlertCircle size={14} color="red" />}
                {log.type === 'info' && <Box w={14} />}
                <Text size="xs" c={log.type === 'error' ? 'red' : 'inherit'}>{log.message}</Text>
              </Group>
            ))}
            {logs.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">기록된 로그가 없습니다.</Text>
            )}
          </Stack>
        </ScrollArea>
      </Paper>

      <style>{`
        .spinning {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
}
