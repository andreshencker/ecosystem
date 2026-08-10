import { AccountingProvider } from '@/providers/AccountingProvider';

/**
 * Accounting module layout.
 *
 * Wraps every page under /accounting with AccountingProvider so provider and
 * connection selection persists across navigation between sub-pages.
 */
export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountingProvider>{children}</AccountingProvider>;
}
