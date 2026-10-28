import type {Metadata} from 'next';
import { Cinzel, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-cinzel',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Kaliyuga Repository Audit & Engineering Workbench',
  description: 'Comprehensive architectural, code quality, performance, asset pipeline, and gameplay mechanics audit of akshat92008/kaalyuga.',
  openGraph: {
    title: 'Kaliyuga Repository Audit & Engineering Workbench',
    description: 'Comprehensive architectural, code quality, performance, asset pipeline, and gameplay mechanics audit of akshat92008/kaalyuga.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaliyuga Repository Audit & Engineering Workbench',
    description: 'Comprehensive architectural, code quality, performance, asset pipeline, and gameplay mechanics audit of akshat92008/kaalyuga.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${jakarta.variable} ${jetbrains.variable} dark`}>
      <body
        suppressHydrationWarning
        className="bg-[#090807] text-[#F5EDE0] font-sans antialiased overflow-hidden select-none"
      >
        {children}
      </body>
    </html>
  );
}
