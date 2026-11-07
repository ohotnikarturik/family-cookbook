import { describe, expect, it } from 'vitest';

import { buildInvitationEmail } from './build-invitation-email.js';

describe('buildInvitationEmail', () => {
  it('escapes names in HTML and keeps the accept link in the text part', () => {
    const built = buildInvitationEmail({
      subject: 'Invitation to <Kitchen>',
      intro: 'A <script> invited you to <Kitchen>',
      actionLabel: 'Accept',
      signInWith: 'Sign in with a@b.test',
      acceptUrl: 'http://localhost:3003/en/invite/accept?token=abc&x=1',
    });

    expect(built.html).toContain('A &lt;script&gt; invited you to &lt;Kitchen&gt;');
    expect(built.html).toContain('href="http://localhost:3003/en/invite/accept?token=abc&amp;x=1"');
    expect(built.html).not.toContain('<script>');
    expect(built.text).toContain('http://localhost:3003/en/invite/accept?token=abc&x=1');
  });
});
