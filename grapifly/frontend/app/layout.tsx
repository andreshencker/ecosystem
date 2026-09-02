import type { Metadata } from 'next';
import './styles.css';
import { GrapiflyThemeProvider } from '@/components/GrapiflyThemeProvider';

export const metadata: Metadata = {
  title: 'Grapifly — One account. Every possibility.',
  description: 'Your identity and applications, together in one thoughtful ecosystem.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><GrapiflyThemeProvider>{children}</GrapiflyThemeProvider></body>
    </html>
  );
}
