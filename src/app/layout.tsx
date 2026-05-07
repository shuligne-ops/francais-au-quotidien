import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Français au Quotidien',
  description: 'Курс разговорного французского языка. 180 уроков, A1–C2.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FFF8F0]">
        {children}
      </body>
    </html>
  );
}
