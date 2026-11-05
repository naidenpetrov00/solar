import {
  SocialSignIn,
  type SocialSignInConfig,
  type SocialSignInLabels,
} from "./social-sign-in";

export function SocialSignInOptions({
  socialSignIn,
  labels,
  forgotPasswordHref,
}: {
  socialSignIn: { google: SocialSignInConfig; facebook: SocialSignInConfig };
  labels: { google: SocialSignInLabels; facebook: SocialSignInLabels };
  forgotPasswordHref: string;
}) {
  return (
    <div className="auth-social">
      <SocialSignIn
        {...socialSignIn.google}
        provider="google"
        forgotPasswordHref={forgotPasswordHref}
        labels={labels.google}
      />
      <SocialSignIn
        {...socialSignIn.facebook}
        provider="facebook"
        forgotPasswordHref={forgotPasswordHref}
        labels={labels.facebook}
      />
    </div>
  );
}
