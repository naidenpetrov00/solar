import type { Ref } from "react";
import {
  VerificationRequestForm,
  type VerificationRequestLabels,
} from "./verification-request-form";

export function SignUpConfirmation({
  email,
  callbackURL,
  headingRef,
  labels,
}: {
  email: string;
  callbackURL: string;
  headingRef: Ref<HTMLHeadingElement>;
  labels: {
    checkEmailTitle: string;
    checkEmailDescription: string;
    deliveryHelp: string;
    verificationRequest: VerificationRequestLabels;
  };
}) {
  return (
    <div className="auth-state" data-tone="neutral" role="status">
      <span className="auth-state-mark" aria-hidden="true" />
      <div>
        <h2 ref={headingRef} tabIndex={-1}>
          {labels.checkEmailTitle}
        </h2>
        <p>{labels.checkEmailDescription}</p>
        <p>{labels.deliveryHelp}</p>
      </div>
      <div className="auth-state-content">
        <VerificationRequestForm
          callbackURL={callbackURL}
          initialEmail={email}
          labels={labels.verificationRequest}
        />
      </div>
    </div>
  );
}
