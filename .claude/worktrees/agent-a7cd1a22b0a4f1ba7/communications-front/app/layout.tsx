import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeRegistry } from '@/providers/ThemeRegistry';
import { QueryProvider } from '@/providers/QueryProvider';
import { GlobalSnackbar } from '@/components/shared';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Communication Portal',
  description: 'Communication Platform Administration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ThemeRegistry>
          <QueryProvider>
            {children}
            <GlobalSnackbar />
          </QueryProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
