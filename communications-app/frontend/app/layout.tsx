import type { Metadata } from 'next';
import { ThemeRegistry } from '@/providers/ThemeRegistry';
import { QueryProvider } from '@/providers/QueryProvider';
import { GlobalSnackbar } from '@/components/shared';

export const metadata: Metadata = {
  title: 'Relay by Grapifly',
  description: 'Connections and automation, securely relayed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
