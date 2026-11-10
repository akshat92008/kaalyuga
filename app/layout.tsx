import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kaliyuga: The Bleeding Crown',
  description:
    "A 2.5D isometric Indian mythological action roguelite about Rudra, Savitri's lantern, three stances, divine Astras, and the cost of not looking.",
  openGraph: {
    title: 'Kaliyuga: The Bleeding Crown',
    description:
      "A 2.5D isometric Indian mythological action roguelite about Rudra, Savitri's lantern, three stances, divine Astras, and the cost of not looking.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaliyuga: The Bleeding Crown',
    description:
      "A 2.5D isometric Indian mythological action roguelite about Rudra, Savitri's lantern, three stances, divine Astras, and the cost of not looking.",
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
