import { PaymentsProvider } from '@/providers/PaymentsProvider';

/**
 * Payments module layout.
 *
 * Wraps every page under /payments with PaymentsProvider so account selection
 * persists across navigation — changing the page does not reset the selector.
 */
export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PaymentsProvider>{children}</PaymentsProvider>;
}
