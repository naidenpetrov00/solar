import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-layout">
        <header className="auth-introduction">
          <h1>{title}</h1>
          <p>{description}</p>
          <span className="auth-horizon" aria-hidden="true" />
        </header>
        <section className="auth-workspace" aria-label={title}>
          {children}
          {footer ? <footer className="auth-footer">{footer}</footer> : null}
        </section>
      </div>
    </main>
  );
}
