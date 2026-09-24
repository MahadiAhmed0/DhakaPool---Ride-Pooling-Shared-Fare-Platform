// Root layout: the HTML shell shared by every page, with the two fonts of the design (ADR-0013).
import type { Metadata } from 'next';
import { Archivo_Black, Noto_Sans_Bengali, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

// Headings: a heavy display font. Body text: a clean grotesk.
const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo-black',
});
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
// The taka sign (৳) is not in either font above. This fallback supplies it; the browser only
// downloads it for Bengali characters.
const notoBengali = Noto_Sans_Bengali({
  weight: ['400', '700'],
  subsets: ['bengali'],
  variable: '--font-bengali',
});

export const metadata: Metadata = {
  title: 'Dhaka Tesla Pool',
  description: 'Share a seat. Split the fare. Survive Dhaka traffic.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} ${notoBengali.variable}`}
    >
      <body className="min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
