import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { EmailSender } from './email/email-sender.js';
import { LogEmailAdapter } from './email/log-email.adapter.js';
import { SmtpEmailAdapter } from './email/smtp-email.adapter.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      // EMAIL_DRIVER picks the adapter: smtp (Mailpit locally) or log.
      provide: EmailSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailSender => {
        if (config.get<string>('EMAIL_DRIVER') !== 'smtp') return new LogEmailAdapter();
        const host = config.get<string>('SMTP_HOST', 'localhost');
        const port = Number(config.get<string>('SMTP_PORT', '1025'));
        new Logger('NotificationsModule').log(`Sending email through ${host}:${port}`);
        return new SmtpEmailAdapter(
          createTransport({ host, port, secure: port === 465 }),
          config.get<string>('EMAIL_FROM', 'SportHub <no-reply@sporthub.local>'),
        );
      },
    },
  ],
})
export class NotificationsModule {}
