import "server-only";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Google is intentionally optional: credentials containing only whitespace
 * should not expose an unusable sign-in path. The original values are passed
 * through to Better Auth so valid credential values are never altered.
 */
export const isGoogleSignInEnabled = Boolean(
  googleClientId?.trim() && googleClientSecret?.trim(),
);

export const googleSocialProvider = isGoogleSignInEnabled
  ? {
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      requireEmailVerification: true,
    }
  : undefined;
