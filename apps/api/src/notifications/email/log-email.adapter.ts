import { Logger } from '@nestjs/common';
import { EmailSender, type EmailMessage } from './email-sender.js';

/** Writes emails to the server log instead of sending them (EMAIL_DRIVER=log). */
export class LogEmailAdapter extends EmailSender {
  private readonly logger = new Logger('Email');

  async send({ to, subject }: EmailMessage): Promise<void> {
    // The address is masked: logs are kept by the hosting provider.
    const masked = to.replace(/^(.).*(@.*)$/, '$1***$2');
    this.logger.log(`Email to ${masked}: ${subject}`);
  }
}
