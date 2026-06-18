import { redirect } from 'next/navigation';

// Root page: redirect to login
// The proxy (src/proxy.ts) will handle authenticated users → /dashboard
export default function RootPage() {
  redirect('/login');
}
