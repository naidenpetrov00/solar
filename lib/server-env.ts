import "server-only";

type ServerEnvironmentVariable =
  | "DATABASE_URL"
  | "BETTER_AUTH_SECRET"
  | "BETTER_AUTH_URL";

export function requireServerEnvironmentVariable(
  name: ServerEnvironmentVariable,
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
