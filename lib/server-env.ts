import "server-only";

type ServerEnvironmentVariable =
  | "DATABASE_URL"
  | "BETTER_AUTH_SECRET"
  | "BETTER_AUTH_URL"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SMTP_SECURE"
  | "SMTP_FROM";

export function requireServerEnvironmentVariable(
  name: ServerEnvironmentVariable,
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export type SmtpEnvironment = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  credentials?: {
    user: string;
    password: string;
  };
};

export function getSmtpEnvironment(): SmtpEnvironment {
  const portValue = requireServerEnvironmentVariable("SMTP_PORT");
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }

  const secureValue = requireServerEnvironmentVariable("SMTP_SECURE");

  if (secureValue !== "true" && secureValue !== "false") {
    throw new Error('SMTP_SECURE must be either "true" or "false".');
  }

  const username = process.env.SMTP_USERNAME;
  const password = process.env.SMTP_PASSWORD;

  if (Boolean(username) !== Boolean(password)) {
    throw new Error(
      "SMTP_USERNAME and SMTP_PASSWORD must either both be set or both be omitted.",
    );
  }

  return {
    host: requireServerEnvironmentVariable("SMTP_HOST"),
    port,
    secure: secureValue === "true",
    from: requireServerEnvironmentVariable("SMTP_FROM"),
    credentials:
      username && password ? { user: username, password } : undefined,
  };
}
