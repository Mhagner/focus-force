'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.issues?.[0]?.message ?? data?.message ?? 'Não foi possível redefinir a senha.');
        setIsSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Erro inesperado. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link inválido" subtitle="Peça um novo link de redefinição.">
        <Link href="/forgot-password" className="block text-center text-primary underline">
          Solicitar novo link
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Senha redefinida" subtitle="Todas as sessões abertas foram encerradas.">
        <Button asChild className="w-full">
          <Link href="/login">Entrar</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma senha com pelo menos 10 caracteres.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-danger text-center" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
