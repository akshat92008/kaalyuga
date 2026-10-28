import type {Metadata} from 'next';
import { Cinzel, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
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
  variable: '--font-jetbrains',
});

const SITE_TITLE = 'Kaliyuga: The Bleeding Crown';
const SITE_DESCRIPTION =
  'An undying warrior who burned a camp of healers climbs a mountain for revenge, and learns the truth about the father who sent him. Vertical slice demo.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${jakarta.variable} ${jetbrains.variable} dark`}>
      <body suppressHydrationWarning className="bg-[#0B0D11] text-[#F1F5F9] antialiased selection:bg-[#D4A548]/30 selection:text-[#F8E7B8]">
        {children}
      </body>
    </html>
  );
}
