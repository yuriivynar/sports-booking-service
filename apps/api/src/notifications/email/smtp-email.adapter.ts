import type { Transporter } from 'nodemailer';
import { EmailSender, type EmailMessage } from './email-sender.js';

/**
 * Adapter over nodemailer, the Adaptee: it turns our EmailMessage into
 * nodemailer's mail options and adds the sender address. Locally the
 * transport points at Mailpit (http://localhost:8025).
 */
export class SmtpEmailAdapter extends EmailSender {
  constructor(
    private readonly transporter: Transporter,
    private readonly from: string,
  ) {
    super();
  }

  async send({ to, subject, text, html }: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
  }
}
