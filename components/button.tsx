import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ComponentPropsWithRef,
  ReactNode,
} from "react";
import type { LinkProps } from "next/link";

export type ButtonVariant = "primary" | "secondary" | "informational";
export type ButtonTone = "default" | "danger";
export type ButtonSize = "default" | "compact" | "icon";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

type ButtonProps = ComponentPropsWithRef<"button"> & ButtonStyleProps;

type ButtonLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> &
  LinkProps &
  ButtonStyleProps & {
    children: ReactNode;
  };

const join = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

const buttonClassName = ({
  variant = "primary",
  tone = "default",
  size = "default",
  fullWidth = false,
  className,
}: ButtonStyleProps) =>
  join(
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? "ui-button--full" : undefined,
    tone === "danger" ? "ui-button--danger" : undefined,
    className,
  );

export function Button({
  variant,
  tone,
  size,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonClassName({ variant, tone, size, fullWidth, className })}
    />
  );
}

export function ButtonLink({
  variant,
  tone,
  size,
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={buttonClassName({ variant, tone, size, fullWidth, className })}
    />
  );
}
