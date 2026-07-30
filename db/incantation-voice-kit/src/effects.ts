import type { WordFlashOptions } from './types';

export function prefersReducedMotion(setting: boolean | 'system' = 'system'): boolean {
  if (typeof setting === 'boolean') return setting;
  return typeof window !== 'undefined'
    && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

export function playWordFlash(
  target: HTMLElement,
  options: WordFlashOptions = {},
): Animation | undefined {
  if (!target || typeof target.animate !== 'function') return undefined;
  const reducedMotion = prefersReducedMotion(options.reducedMotion);
  const style = getComputedStyle(target);
  const originalColor = style.color;
  const originalBackground = style.backgroundColor;
  const originalBorder = style.borderColor;
  const accent = options.color ?? '#63f0d4';
  const duration = reducedMotion
    ? Math.min(140, options.durationMs ?? 900)
    : Math.max(240, options.durationMs ?? 900);

  return target.animate([
    {
      offset: 0,
      color: originalColor,
      backgroundColor: originalBackground,
      borderColor: originalBorder,
      filter: 'brightness(1) saturate(1)',
      transform: 'scale(1)',
      boxShadow: 'none',
    },
    {
      offset: .22,
      color: '#ffffff',
      backgroundColor: `color-mix(in srgb, ${accent} 34%, ${originalBackground})`,
      borderColor: accent,
      filter: 'brightness(1.35) saturate(1.3)',
      transform: reducedMotion ? 'scale(1)' : 'scale(1.08)',
      boxShadow: `0 0 24px color-mix(in srgb, ${accent} 72%, transparent)`,
    },
    {
      offset: .52,
      color: '#fff7d1',
      backgroundColor: `color-mix(in srgb, #f4d66d 36%, ${originalBackground})`,
      borderColor: '#f4d66d',
      filter: 'brightness(1.45) saturate(1.2)',
      transform: reducedMotion ? 'scale(1)' : 'scale(1.04)',
      boxShadow: '0 0 28px rgba(244, 214, 109, .72)',
    },
    {
      offset: .76,
      color: '#ffffff',
      backgroundColor: `color-mix(in srgb, #b98cff 32%, ${originalBackground})`,
      borderColor: '#b98cff',
      filter: 'brightness(1.25) saturate(1.25)',
      transform: 'scale(1)',
      boxShadow: '0 0 22px rgba(185, 140, 255, .64)',
    },
    {
      offset: 1,
      color: originalColor,
      backgroundColor: originalBackground,
      borderColor: originalBorder,
      filter: 'brightness(1) saturate(1)',
      transform: 'scale(1)',
      boxShadow: 'none',
    },
  ], {
    duration,
    easing: 'cubic-bezier(.18,.78,.22,1)',
    fill: 'none',
  });
}
