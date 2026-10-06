import "server-only";

export type EmailMessage = {
  recipient: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailTransport = {
  kind: "smtp";
  send(message: EmailMessage): Promise<boolean>;
};
