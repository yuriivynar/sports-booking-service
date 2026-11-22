export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Target interface of the Adapter pattern for email. Notifications send
 * through it and never see the transport (SMTP, the server log, a mail API).
 */
export abstract class EmailSender {
  abstract send(message: EmailMessage): Promise<void>;
}
