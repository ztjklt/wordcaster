export type JoystickKey = "KeyA" | "KeyD" | "Space" | "KeyS";

export interface JoystickVector {
  x: number;
  y: number;
  keys: JoystickKey[];
}

export const JOYSTICK_MAX_TRAVEL = 32;
export const JOYSTICK_DEAD_ZONE = 14;
export const FAST_FALL_GRAVITY_MULTIPLIER = 2.2;
export const NORMAL_FALL_SPEED = 360;
export const FAST_FALL_SPEED = 480;

export function resolveJoystickVector(
  deltaX: number,
  deltaY: number,
  maxTravel = JOYSTICK_MAX_TRAVEL,
  deadZone = JOYSTICK_DEAD_ZONE,
): JoystickVector {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= deadZone || maxTravel <= 0) {
    return { x: 0, y: 0, keys: [] };
  }

  const scale = Math.min(1, maxTravel / distance);
  const x = deltaX * scale;
  const y = deltaY * scale;
  const axisThreshold = Math.max(deadZone, maxTravel * 0.34);
  const keys: JoystickKey[] = [];

  if (x <= -axisThreshold) keys.push("KeyA");
  if (x >= axisThreshold) keys.push("KeyD");
  if (y <= -axisThreshold) keys.push("Space");
  if (y >= axisThreshold) keys.push("KeyS");

  return { x, y, keys };
}

export function nextVerticalVelocity(
  currentVelocity: number,
  deltaTime: number,
  gravity: number,
  fastFall: boolean,
): number {
  const acceleration =
    gravity * (fastFall ? FAST_FALL_GRAVITY_MULTIPLIER : 1);
  const speedLimit = fastFall
    ? FAST_FALL_SPEED
    : Math.max(NORMAL_FALL_SPEED, currentVelocity);
  return Math.min(speedLimit, currentVelocity + acceleration * deltaTime);
}
