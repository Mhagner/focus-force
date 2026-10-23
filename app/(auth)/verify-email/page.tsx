'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';

// Confirmação por clique (POST) em vez de ao abrir a página: scanners de e-mail
// que pré-visitam links não conseguem consumir o token.
function VerifyContent() {
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const confirm = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.message ?? 'Link inválido ou expirado.');
        setStatus('error');
        return;
      }
      setStatus('ok');
    } catch {
      setMessage('Erro inesperado. Tente novamente.');
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link inválido" subtitle="Abra o link completo enviado ao seu e-mail.">
        <Link href="/login" className="block text-center text-primary underline">
          Ir para o login
        </Link>
      </AuthShell>
    );
  }

  if (status === 'ok') {
    return (
      <AuthShell title="E-mail confirmado" subtitle="Sua conta está ativa.">
        <Button asChild className="w-full">
          <Link href="/login">Entrar</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirmar e-mail" subtitle="Clique para ativar sua conta.">
      {status === 'error' && (
        <p className="text-sm text-danger text-center" role="alert">
          {message}
        </p>
      )}
      <Button className="w-full" onClick={confirm} disabled={status === 'loading'}>
        {status === 'loading' ? 'Confirmando...' : 'Confirmar e-mail'}
      </Button>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
