import { redirect } from 'next/navigation';

export default function LegacyEmployeeUsersPage() {
  redirect('/admin/users');
}
