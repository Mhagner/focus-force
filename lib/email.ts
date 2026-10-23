import { Resend } from 'resend';

function appUrl(): string {
  return (process.env.AUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function send(to: string, subject: string, html: string, devLink?: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY não configurada.');
    }
    // Em desenvolvimento, imprime o link no console em vez de enviar.
    console.info(`[email:dev] para=${to} assunto="${subject}" link=${devLink ?? '-'}`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'FocusForge <onboarding@resend.dev>';
  const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html });
  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }
}

function layout(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  const safeUrl = escapeHtml(ctaUrl);
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
    <h2 style="color:#035578">${escapeHtml(title)}</h2>
    <p>${body}</p>
    <p style="margin:28px 0"><a href="${safeUrl}" style="background:#035578;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${escapeHtml(ctaLabel)}</a></p>
    <p style="font-size:12px;color:#6b7280">Se o botão não funcionar, copie este link:<br>${safeUrl}</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await send(
    to,
    'Confirme seu e-mail no FocusForge',
    layout('Confirme seu e-mail', 'Clique no botão para ativar sua conta. O link expira em 24 horas.', 'Confirmar e-mail', url),
    url
  );
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    to,
    'Redefinição de senha do FocusForge',
    layout(
      'Redefinir senha',
      'Recebemos um pedido para redefinir sua senha. O link expira em 1 hora. Se não foi você, ignore este e-mail.',
      'Redefinir senha',
      url
    ),
    url
  );
}

export async function sendAccountExistsEmail(to: string) {
  const url = `${appUrl()}/login`;
  await send(
    to,
    'Você já tem uma conta no FocusForge',
    layout(
      'Você já tem uma conta',
      'Alguém tentou criar uma conta com este e-mail. Se foi você, entre normalmente ou use "Esqueci a senha". Se não foi, ignore.',
      'Ir para o login',
      url
    ),
    url
  );
}
