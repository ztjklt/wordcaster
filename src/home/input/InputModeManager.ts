import type { HomeInputMode, HomeVector } from '../HomeTypes';

interface InputSourceState {
  vector: HomeVector;
  updatedAt: number;
}

const MODES: readonly Exclude<HomeInputMode, 'auto'>[] = ['keyboard', 'gamepad', 'touch', 'orientation'];

const magnitude = (value: HomeVector): number => Math.hypot(value.x, value.y);

const normalize = (value: HomeVector): HomeVector => {
  const length = magnitude(value);
  if (length <= 1) return value;
  return { x: value.x / length, y: value.y / length };
};

export class InputModeManager {
  private readonly sources = new Map<Exclude<HomeInputMode, 'auto'>, InputSourceState>();
  private preferredMode: HomeInputMode;
  private activeMode: Exclude<HomeInputMode, 'auto'> = 'keyboard';

  constructor(initialMode: HomeInputMode = 'auto') {
    this.preferredMode = initialMode;
    MODES.forEach((mode) => this.sources.set(mode, { vector: { x: 0, y: 0 }, updatedAt: 0 }));
  }

  get mode(): HomeInputMode { return this.preferredMode; }
  get currentSource(): Exclude<HomeInputMode, 'auto'> { return this.activeMode; }

  setMode(mode: HomeInputMode): void {
    this.preferredMode = mode;
    if (mode !== 'auto') this.activeMode = mode;
  }

  cycleMode(): HomeInputMode {
    const cycle: readonly HomeInputMode[] = ['auto', 'keyboard', 'gamepad', 'orientation'];
    const index = cycle.indexOf(this.preferredMode);
    this.setMode(cycle[(index + 1) % cycle.length]);
    return this.preferredMode;
  }

  updateSource(mode: Exclude<HomeInputMode, 'auto'>, vector: HomeVector, now: number): void {
    const deadzoned = magnitude(vector) < .12 ? { x: 0, y: 0 } : normalize(vector);
    const previous = this.sources.get(mode);
    this.sources.set(mode, {
      vector: deadzoned,
      updatedAt: magnitude(deadzoned) > 0 ? now : previous?.updatedAt ?? 0,
    });
  }

  resolve(): HomeVector {
    if (this.preferredMode !== 'auto') {
      this.activeMode = this.preferredMode;
      return this.sources.get(this.preferredMode)?.vector ?? { x: 0, y: 0 };
    }
    const active = [...this.sources.entries()]
      .filter(([, state]) => magnitude(state.vector) > 0)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
    if (active) this.activeMode = active[0];
    return active?.[1].vector ?? this.sources.get(this.activeMode)?.vector ?? { x: 0, y: 0 };
  }
}
