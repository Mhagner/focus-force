let audioContext: AudioContext | null = null;

type SoundType = 'start' | 'end';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

export function playSessionSound(type: SoundType) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  const baseFrequency = type === 'start' ? 880 : 440;
  oscillator.frequency.setValueAtTime(baseFrequency, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.6);
}

export function playBreakAlarm(durationSec = 10) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const safeDurationSec = Math.max(durationSec, 1);
  const startAt = ctx.currentTime + 0.02;
  const endAt = startAt + safeDurationSec;
  const beepIntervalSec = 0.45;
  const beepDurationSec = 0.2;

  let cursor = startAt;
  let useHighTone = true;

  while (cursor < endAt) {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(useHighTone ? 1046 : 784, cursor);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, cursor);
    gain.gain.exponentialRampToValueAtTime(0.09, cursor + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(cursor + beepDurationSec, endAt));

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(cursor);
    oscillator.stop(Math.min(cursor + beepDurationSec, endAt));

    useHighTone = !useHighTone;
    cursor += beepIntervalSec;
  }
}
