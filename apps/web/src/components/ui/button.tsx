// Buttons (ADR-0013): thick border, hard shadow, capital letters. A pressed button sinks into the
// page: it moves 4 px and loses its shadow. Use ButtonLink for navigation that looks like a button.
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-action',
  secondary: 'bg-white',
  danger: 'bg-warning',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 border-3 border-ink px-5 py-3 font-bold uppercase ' +
  'tracking-wide shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 ' +
  'active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-x-0 ' +
  'disabled:active:translate-y-0 disabled:active:shadow-brutal';

export function buttonClasses(variant: ButtonVariant = 'primary', fullWidth = false): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  variant,
  fullWidth,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClasses(variant, fullWidth)} ${className}`} {...rest} />
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function ButtonLink({ href, children, variant, fullWidth }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, fullWidth)}>
      {children}
    </Link>
  );
}
