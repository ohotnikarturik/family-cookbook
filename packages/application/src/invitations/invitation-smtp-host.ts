/** True when SMTP is aimed at local Mailpit / loopback (dev only). */
export function isLocalInvitationSmtpHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1'
  );
}
