// The UI kit on one page, for developers only (ADR-0013). It does not exist in production.
import { notFound } from 'next/navigation';
import { StyleguideDemo } from './styleguide-demo';

export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <StyleguideDemo />;
}
