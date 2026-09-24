// A card: a white (or coloured) block with the thick border and hard shadow (ADR-0013).
import type { ReactNode } from 'react';

export type CardTone = 'plain' | 'action' | 'warning' | 'info' | 'success' | 'danger';

const TONE_CLASSES: Record<CardTone, string> = {
  plain: 'bg-white',
  action: 'bg-action',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  danger: 'bg-danger',
};

type CardProps = { title?: string; tone?: CardTone; children: ReactNode; className?: string };

export function Card({ title, tone = 'plain', children, className = '' }: CardProps) {
  return (
    <section className={`border-3 border-ink p-5 shadow-brutal ${TONE_CLASSES[tone]} ${className}`}>
      {title ? <h2 className="mb-4 text-xl">{title}</h2> : null}
      {children}
    </section>
  );
}
