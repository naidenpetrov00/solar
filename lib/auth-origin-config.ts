type AuthOriginConfigInput = {
  baseUrl: string | undefined;
  trustedOrigins: string | undefined;
  production: boolean;
};

function parseOrigin(value: string, name: string, production: boolean) {
  if (!value || value !== value.trim() || value.includes("*")) {
    throw new Error(`${name} must contain complete HTTP(S) origins.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} contains an invalid origin.`);
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    (production && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must contain origin-only ${production ? "HTTPS" : "HTTP(S)"} URLs.`,
    );
  }

  return url.origin;
}

export function getAuthOriginConfig(input: AuthOriginConfigInput) {
  const baseUrl = parseOrigin(
    input.baseUrl ?? "",
    "BETTER_AUTH_URL",
    input.production,
  );
  const entries = input.trustedOrigins
    ? input.trustedOrigins.split(",")
    : [];

  if (entries.some((entry) => !entry.trim())) {
    throw new Error(
      "BETTER_AUTH_TRUSTED_ORIGINS must not contain empty entries.",
    );
  }

  const trustedOrigins = [
    ...new Set(
      entries.map((entry) =>
        parseOrigin(
          entry.trim(),
          "BETTER_AUTH_TRUSTED_ORIGINS",
          input.production,
        ),
      ),
    ),
  ].filter((origin) => origin !== baseUrl);

  return {
    baseUrl,
    trustedOrigins,
    allowedDevHostnames: [
      ...new Set(trustedOrigins.map((origin) => new URL(origin).hostname)),
    ],
  };
}
