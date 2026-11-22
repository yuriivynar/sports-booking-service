import type { NotificationType } from '../../generated/prisma/client.js';

export interface Recipient {
  fullName: string | null;
}

export interface RenderedNotification {
  type: NotificationType;
  title: string;
  /** Plain text for the in-app list. */
  body: string;
  /** Path in the web app, for example /bookings/123. */
  link: string | null;
  email: { subject: string; text: string; html: string };
}

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'Europe/Kyiv',
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** "пт, 27 листопада о 18:00" in Kyiv time. */
export function formatWhen(instant: Date): string {
  return timeFormatter.format(instant);
}

/** Names come from users: escape them before they go into HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Template Method: `render` fixes the order of the steps — title,
 * greeting, body, link, sign-off, then the email wrapper. Subclasses
 * supply `title` and `lines`; `greeting`, `link` and `footer` are hooks
 * with a default that a subclass may override.
 */
export abstract class NotificationTemplate<E> {
  abstract readonly type: NotificationType;

  /** The template method. Final by convention: subclasses do not override it. */
  render(event: E, recipient: Recipient, webOrigin: string): RenderedNotification {
    const title = this.title(event);
    const lines = this.lines(event);
    const link = this.link(event);
    const greeting = this.greeting(recipient);
    const footer = this.footer();
    const url = link ? `${webOrigin}${link}` : null;

    const text = [greeting, '', ...lines, ...(url ? ['', url] : []), '', footer].join('\n');
    const html = `<!doctype html><html lang="uk"><body style="margin:0;background:#f5f5f4;font-family:Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#ff6a00;padding:20px 28px;color:#1c1917;font-size:20px;font-weight:bold">SportHub</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
${lines.map((line) => `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(line)}</p>`).join('\n')}
${url ? `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#ff6a00;color:#1c1917;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Відкрити в SportHub</a></p>` : ''}
<p style="margin:20px 0 0;color:#78716c">${escapeHtml(footer)}</p>
</td></tr></table></td></tr></table></body></html>`;

    return {
      type: this.type,
      title,
      body: lines.join(' '),
      link,
      email: { subject: `SportHub: ${title}`, text, html },
    };
  }

  protected abstract title(event: E): string;

  protected abstract lines(event: E): string[];

  /** Hook: where the notification leads; none by default. */
  protected link(_event: E): string | null {
    return null;
  }

  /** Hook: the greeting line. */
  protected greeting({ fullName }: Recipient): string {
    const firstName = fullName?.trim().split(/\s+/)[0];
    return firstName ? `Вітаємо, ${firstName}!` : 'Вітаємо!';
  }

  /** Hook: the sign-off line. */
  protected footer(): string {
    return 'До зустрічі в SportHub!';
  }
}
