import type { HomeVector } from '../HomeTypes';

interface DeviceOrientationConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export type OrientationPermissionState = 'unavailable' | 'prompt' | 'granted' | 'denied';

export class OrientationInput {
  private beta = 0;
  private gamma = 0;
  private calibratedBeta = 0;
  private calibratedGamma = 0;
  private attached = false;
  private permission: OrientationPermissionState;

  constructor(calibration?: { calibratedBeta: number; calibratedGamma: number }) {
    this.calibratedBeta = calibration?.calibratedBeta ?? 0;
    this.calibratedGamma = calibration?.calibratedGamma ?? 0;
    this.permission = typeof window === 'undefined' || !('DeviceOrientationEvent' in window) ? 'unavailable' : 'prompt';
  }

  get state(): OrientationPermissionState { return this.permission; }
  get calibration(): { calibratedBeta: number; calibratedGamma: number } {
    return { calibratedBeta: this.calibratedBeta, calibratedGamma: this.calibratedGamma };
  }
  get raw(): { beta: number; gamma: number } { return { beta: this.beta, gamma: this.gamma }; }

  async requestPermission(): Promise<OrientationPermissionState> {
    if (this.permission === 'unavailable') return this.permission;
    try {
      const constructor = window.DeviceOrientationEvent as unknown as DeviceOrientationConstructorWithPermission;
      const result = constructor.requestPermission ? await constructor.requestPermission() : 'granted';
      this.permission = result === 'granted' ? 'granted' : 'denied';
      if (this.permission === 'granted') this.attach();
    } catch {
      this.permission = 'denied';
    }
    return this.permission;
  }

  attach(): void {
    if (this.attached || this.permission === 'unavailable' || typeof window === 'undefined') return;
    this.attached = true;
    if (this.permission === 'prompt') this.permission = 'granted';
    window.addEventListener('deviceorientation', this.handleOrientation);
  }

  calibrate(): void {
    this.calibratedBeta = this.beta;
    this.calibratedGamma = this.gamma;
  }

  vector(): HomeVector {
    const gamma = this.deadzone((this.gamma - this.calibratedGamma) / 22);
    const beta = this.deadzone((this.beta - this.calibratedBeta) / 22);
    const angle = typeof screen !== 'undefined' ? screen.orientation?.angle ?? 0 : 0;
    const rotated = angle === 90
      ? { x: beta, y: -gamma }
      : angle === 270
        ? { x: -beta, y: gamma }
        : angle === 180
          ? { x: -gamma, y: -beta }
          : { x: gamma, y: beta };
    const length = Math.hypot(rotated.x, rotated.y);
    return length > 1 ? { x: rotated.x / length, y: rotated.y / length } : rotated;
  }

  destroy(): void {
    if (this.attached) window.removeEventListener('deviceorientation', this.handleOrientation);
    this.attached = false;
  }

  private readonly handleOrientation = (event: DeviceOrientationEvent): void => {
    const smoothing = .18;
    const nextBeta = event.beta ?? this.beta;
    const nextGamma = event.gamma ?? this.gamma;
    this.beta += (nextBeta - this.beta) * smoothing;
    this.gamma += (nextGamma - this.gamma) * smoothing;
  };

  private deadzone(value: number): number {
    const absolute = Math.abs(value);
    if (absolute < .16) return 0;
    return Math.sign(value) * Math.min(1, (absolute - .16) / .84);
  }
}
