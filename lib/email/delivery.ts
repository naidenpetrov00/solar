import "server-only";

export type EmailMessage = {
  recipient: string;
  messageId?: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailDeliveryResult =
  | { status: "sent"; providerMessageId: string | null }
  | {
      status: "failed";
      errorCode: "SMTP_TEMPORARY" | "SMTP_PERMANENT";
      retryable: boolean;
    };

export type EmailTransport = {
  kind: string;
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
};
