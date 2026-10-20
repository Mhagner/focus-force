'use client';

import { CheckCircle2, Download, Share, SquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePwaInstall } from '@/hooks/use-pwa-install';

function IosInstructions() {
  return (
    <ol className="space-y-2 text-sm text-ink-muted">
      <li className="flex items-start gap-2">
        <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Toque em <strong className="text-ink">Compartilhar</strong> na barra do Safari.</span>
      </li>
      <li className="flex items-start gap-2">
        <SquarePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Escolha <strong className="text-ink">Adicionar à Tela de Início</strong>.</span>
      </li>
    </ol>
  );
}

/** Botão compacto "Instalar" para a TopNav: só aparece quando instalável e não instalado. */
export function InstallButton() {
  const { canInstall, canPromptNative, isDismissed, promptInstall, dismiss } = usePwaInstall();

  if (!canInstall || isDismissed) {
    return null;
  }

  if (!canPromptNative) {
    // iOS: sem prompt nativo, mostra instruções.
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="border-border text-ink-muted hover:text-ink">
            <Download className="mr-2 h-4 w-4" />
            Instalar
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 border-border bg-surface">
          <p className="mb-3 text-sm font-semibold text-ink">Instalar o FocusForge</p>
          <IosInstructions />
          <Button variant="ghost" size="sm" className="mt-3 w-full text-ink-muted" onClick={dismiss}>
            Não mostrar novamente
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-border text-ink-muted hover:text-ink"
      onClick={async () => {
        const outcome = await promptInstall();
        if (outcome === 'dismissed') dismiss();
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      Instalar
    </Button>
  );
}

/** Card "Instalar aplicativo" para a página de configurações: sempre visível. */
export function InstallCard() {
  const { canInstall, canPromptNative, isInstalled, isIos, promptInstall } = usePwaInstall();

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Download className="h-5 w-5 text-ink-muted" />
        <div>
          <h2 className="text-lg font-semibold text-ink">Instalar aplicativo</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Use o FocusForge como app, em janela própria e com acesso rápido pela tela inicial.
          </p>
        </div>
      </div>

      {isInstalled ? (
        <div className="flex items-center gap-2 text-sm text-ink">
          <CheckCircle2 className="h-4 w-4 text-success" />
          O aplicativo já está instalado neste dispositivo.
        </div>
      ) : canPromptNative ? (
        <Button onClick={() => void promptInstall()}>
          <Download className="mr-2 h-4 w-4" />
          Instalar FocusForge
        </Button>
      ) : isIos && canInstall ? (
        <IosInstructions />
      ) : (
        <p className="text-sm text-ink-muted">
          A instalação não está disponível agora. Use o menu do navegador (&quot;Instalar app&quot; ou
          &quot;Adicionar à tela inicial&quot;) ou acesse o site por HTTPS em um navegador compatível.
        </p>
      )}
    </Card>
  );
}
