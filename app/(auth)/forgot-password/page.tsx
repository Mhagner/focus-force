'use client';

import { useState } from 'react';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? 'Não foi possível enviar o e-mail.');
      } else {
        setMessage(data?.message ?? 'Se o e-mail estiver cadastrado, enviamos as instruções.');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Esqueci a senha"
      subtitle="Informe seu e-mail para receber o link de redefinição."
      footer={
        <Link href="/login" className="text-primary underline">
          Voltar ao login
        </Link>
      }
    >
      {message ? (
        <p className="text-center text-sm text-ink">{message}</p>
      ) : (
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
          {error && (
            <p className="text-sm text-danger text-center" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar link'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
