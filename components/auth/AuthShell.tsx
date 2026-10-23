import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-ink px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold text-primary">{title}</h1>
          {subtitle && <p className="text-ink-muted">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

/** Aceita só caminhos internos, evitando open redirect via ?from= / ?callbackUrl=. */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}
