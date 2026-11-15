import type { Metadata } from 'next';
import { Cinzel, Rajdhani } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-ui',
});

export const metadata: Metadata = {
  title: 'Kaalyuga: The Bleeding Crown — Chamber Prototype',
  description:
    'Isometric 3D mythological action combat prototype: Rudra battles Dundubhi in the Bronze Drum Sanctuary with cel-shaded ink shaders and elemental slash ribbons.',
  openGraph: {
    title: 'Kaalyuga: The Bleeding Crown — Chamber Prototype',
    description:
      'Isometric 3D mythological action combat prototype: Rudra battles Dundubhi in the Bronze Drum Sanctuary.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaalyuga: The Bleeding Crown — Chamber Prototype',
    description:
      'Isometric 3D mythological action combat prototype: Rudra battles Dundubhi in the Bronze Drum Sanctuary.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${rajdhani.variable}`}>
      <body
        data-state="title"
        className="bg-[#08070a] text-[#f5ecd7] antialiased selection:bg-amber-600/40 overflow-hidden"
        style={{ fontFamily: 'var(--font-ui), sans-serif' }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
