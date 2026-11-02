export function auditSecurityEvent(event: string, details: Record<string, unknown> = {}) {
  console.info(JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}
