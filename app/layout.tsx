import type {Metadata} from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#090807] text-[#F5EDE0] font-sans antialiased overflow-hidden select-none"
      >
        {children}
      </body>
    </html>
  );
}
