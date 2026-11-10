type LogFields = {
  requestId?: string;
  tool?: string;
  outcome?: string;
  userId?: string;
  familyId?: string;
  oauthClientId?: string;
};

export function logMcpEvent(level: 'info' | 'warn', message: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    level,
    component: 'mcp',
    message,
    ...fields,
  });
  if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}
