import Link from "next/link";

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
        <Link className="auth-secondary-action" href={link.href}>
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}
