'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowLeft, Loader2, LogIn, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SimpleOTP from '@/components/ui/simple-otp';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('from') ?? '/';

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedEmail) {
      setError('Informe um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? 'Não foi possível enviar o código.');
      }

      setStep('code');
      setInfoMessage('Enviamos um código de 6 dígitos para o seu e-mail.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sanitizedCode = code.replace(/\D/g, '').slice(0, 6);

    if (sanitizedCode.length !== 6) {
      setError('Informe os 6 dígitos do código de acesso.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Wrap signIn in a timeout so we don't leave the UI stuck if the request hangs
      const signInPromise = signIn('magic-link', {
        email: normalizedEmail,
        code: sanitizedCode,
        redirect: false,
        callbackUrl,
      });

      const timeoutMs = 10000; // 10s
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo de resposta do servidor excedido.')), timeoutMs)
      );
      const result = await Promise.race<any>([signInPromise as Promise<any>, timeoutPromise]);

      // Log result for debugging if something unexpected happens
      // eslint-disable-next-line no-console
      console.debug('signIn result:', result);

      if (!result) {
        throw new Error('Resposta inesperada do provedor de autenticação.');
      }

      if (result?.error) {
        throw new Error(result.error || 'Erro ao autenticar');
      }

      // Navigate to callback (or fallback)
      try {
        await Promise.resolve(router.replace(result?.url ?? callbackUrl));
      } catch (navErr) {
        // eslint-disable-next-line no-console
        console.error('Erro ao redirecionar após login:', navErr);
      }
      try {
        await Promise.resolve(router.refresh());
      } catch (rErr) {
        // ignore
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erro em handleVerifyCode:', err);
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar com o código informado.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await signIn('google', { callbackUrl });
    } catch (err) {
      setError('Não foi possível iniciar o login com Google.');
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (isSubmitting || !normalizedEmail) {
      if (!normalizedEmail) {
        setError('Informe um e-mail válido.');
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? 'Não foi possível reenviar o código.');
      }

      setInfoMessage('Um novo código foi enviado para o seu e-mail.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar o código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setInfoMessage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bem-vindo ao FocusForge</h1>
          <p className="text-gray-400">Acesse com um código enviado ao seu e-mail ou usando a sua conta Google.</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-gray-300">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            {infoMessage && !error && <p className="text-sm text-emerald-400 text-center">{infoMessage}</p>}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || !normalizedEmail}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando código...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar código de acesso
                </span>
              )}
            </Button>

            <div className="relative flex items-center justify-center">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-500">ou</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-gray-700 text-gray-200 hover:bg-gray-900"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <span className="flex items-center justify-center gap-2">
                <LogIn className="h-4 w-4" />
                Entrar com Google
              </span>
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="access-code" className="text-gray-300">
                  Código de acesso
                </Label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
                  onClick={handleBackToEmail}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Alterar e-mail
                </button>
              </div>

              <p className="text-sm text-gray-400">Enviamos o código para {normalizedEmail}. Digite abaixo para entrar.</p>

              <SimpleOTP
                value={code}
                onChange={(v) => {
                  const sanitized = (v ?? '').toString().replace(/\D/g, '').slice(0, 6);
                  setCode(sanitized);
                  if (error) setError(null);
                }}
                length={6}
                autoFocus
                className="justify-center"
              />

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              {infoMessage && !error && <p className="text-sm text-emerald-400 text-center">{infoMessage}</p>}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando código...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-gray-400 hover:text-gray-200"
              onClick={handleResendCode}
              disabled={isSubmitting}
            >
              Reenviar código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
