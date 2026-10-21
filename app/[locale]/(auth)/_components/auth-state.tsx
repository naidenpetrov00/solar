import { ButtonLink } from "@/components/button";

type AuthStateProps = {
  title: string;
  description: string;
  link?: {
    href: string;
    label: string;
  };
  tone?: "neutral" | "success" | "error";
};

export function AuthState({
  title,
  description,
  link,
  tone = "neutral",
}: AuthStateProps) {
  return (
    <div className="auth-state" data-tone={tone}>
      <span className="auth-state-mark" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {link ? (
        <ButtonLink variant="secondary" href={link.href}>
          {link.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
