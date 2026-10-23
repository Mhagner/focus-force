'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { AuthShell, safeRedirectPath } from '@/components/auth/AuthShell';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirectPath(params.get('from'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauthError = params.get('error');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result || result.error) {
        setError('E-mail ou senha inválidos, ou e-mail ainda não confirmado.');
        setIsSubmitting(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError('Erro inesperado ao entrar. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Bem-vindo ao FocusForge"
      subtitle="Entre para continuar."
      footer={
        <>
          Não tem conta?{' '}
          <Link href="/register" className="text-primary underline">
            Criar conta
          </Link>
        </>
      }
    >
      <GoogleButton callbackUrl={redirectTo} />
      <OrDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/forgot-password" className="text-xs text-primary underline">
              Esqueci a senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {(error || oauthError) && (
          <p className="text-sm text-danger text-center" role="alert">
            {error ?? 'Não foi possível entrar com o Google. Tente novamente.'}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
