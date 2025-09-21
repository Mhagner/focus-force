'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCodeChange = (value: string) => {
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(sanitizedValue);

    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedCode = code.replace(/\D/g, '');

    if (sanitizedCode.length !== 6) {
      setError('Informe os 6 dígitos do código de acesso.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: sanitizedCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message ?? 'Não foi possível autenticar com o código informado.');
        setIsSubmitting(false);
        return;
      }

      router.replace('/');
      router.refresh();
    } catch (err) {
      setError('Erro inesperado ao autenticar. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bem-vindo ao FocusForge</h1>
          <p className="text-gray-400">
            Digite o código de acesso de 6 dígitos para entrar no painel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="access-code" className="text-gray-300">
              Código de acesso
            </Label>
            <InputOTP
              id="access-code"
              value={code}
              onChange={handleCodeChange}
              maxLength={6}
              containerClassName="justify-center"
              inputMode="numeric"
              pattern="\d*"
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
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
