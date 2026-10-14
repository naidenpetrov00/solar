import "server-only";

const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

/**
 * Facebook is optional. Whitespace-only credentials do not enable the
 * provider, while the original values are passed through unchanged once it is
 * available.
 *
 * Facebook does not provide a sufficiently reliable per-email verification
 * claim for implicit account linking. Better Auth therefore uses the existing
 * local verification email before it creates a session for a new Facebook
 * account.
 */
export const isFacebookSignInEnabled = Boolean(
  facebookClientId?.trim() && facebookClientSecret?.trim(),
);

export const facebookSocialProvider = isFacebookSignInEnabled
  ? {
      clientId: facebookClientId!,
      clientSecret: facebookClientSecret!,
      requireEmailVerification: true,
    }
  : undefined;
