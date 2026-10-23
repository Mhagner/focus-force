'use client';

import { useState } from 'react';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError('Aceite os termos para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, email, password, acceptTerms }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.issues?.[0]?.message ?? data?.message ?? 'Não foi possível criar a conta.');
        setIsSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Erro inesperado. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        title="Verifique seu e-mail"
        subtitle="Se o endereço puder ser usado, enviamos um link de confirmação. Ele expira em 24 horas."
        footer={
          <Link href="/login" className="text-primary underline">
            Voltar ao login
          </Link>
        }
      >
        <p className="text-center text-sm text-ink-muted">
          Não recebeu? Confira a caixa de spam ou peça um novo link na tela de login.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a organizar seu foco."
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="text-primary underline">
            Entrar
          </Link>
        </>
      }
    >
      <GoogleButton />
      <OrDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-ink-muted">Mínimo de 10 caracteres.</p>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(value) => setAcceptTerms(value === true)} />
          <Label htmlFor="terms" className="text-sm font-normal leading-snug">
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </Label>
        </div>

        {error && (
          <p className="text-sm text-danger text-center" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar conta'}
        </Button>
      </form>
    </AuthShell>
  );
}
