import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Keep your scorecards, streak and readiness across devices.',
};

export default function LoginPage() {
  return <AuthForm />;
}
