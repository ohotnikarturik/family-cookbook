export type InvitationEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildInvitationEmail(input: {
  subject: string;
  intro: string;
  actionLabel: string;
  signInWith: string;
  acceptUrl: string;
}): InvitationEmailContent {
  const safeUrl = escapeHtml(input.acceptUrl);
  return {
    subject: input.subject,
    text: [input.intro, '', input.actionLabel, input.acceptUrl, '', input.signInWith].join('\n'),
    html: [
      `<p>${escapeHtml(input.intro)}</p>`,
      `<p><a href="${safeUrl}">${escapeHtml(input.actionLabel)}</a></p>`,
      `<p>${escapeHtml(input.signInWith)}</p>`,
    ].join(''),
  };
}
