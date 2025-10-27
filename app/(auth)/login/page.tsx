'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowLeft, Loader2, LogIn, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
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
      const result = await signIn('magic-link', {
        email: normalizedEmail,
        code: sanitizedCode,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.replace(result?.url ?? callbackUrl);
      router.refresh();
    } catch (err) {
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

  const onCodeChange = (value: string) => {
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(sanitizedValue);

    if (error) {
      setError(null);
    }
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

              <InputOTP
                id="access-code"
                value={code}
                onChange={onCodeChange}
                maxLength={6}
                containerClassName="justify-center"
                inputMode="numeric"
                pattern="\\d*"
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

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
