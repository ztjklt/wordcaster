import assert from "node:assert/strict";
import test from "node:test";

import {
  FAST_FALL_SPEED,
  JOYSTICK_MAX_TRAVEL,
  nextVerticalVelocity,
  resolveJoystickVector,
} from "../app/game/joystick.ts";

test("joystick dead zone is neutral and travel is clamped", () => {
  assert.deepEqual(resolveJoystickVector(5, -4).keys, []);
  const resolved = resolveJoystickVector(80, 60);
  assert.ok(
    Math.hypot(resolved.x, resolved.y) <= JOYSTICK_MAX_TRAVEL + 0.001,
  );
});

test("joystick resolves four directions and diagonal combinations", () => {
  assert.deepEqual(resolveJoystickVector(-40, 0).keys, ["KeyA"]);
  assert.deepEqual(resolveJoystickVector(40, 0).keys, ["KeyD"]);
  assert.deepEqual(resolveJoystickVector(0, -40).keys, ["Space"]);
  assert.deepEqual(resolveJoystickVector(0, 40).keys, ["KeyS"]);
  assert.deepEqual(resolveJoystickVector(-40, -40).keys, ["KeyA", "Space"]);
  assert.deepEqual(resolveJoystickVector(40, 40).keys, ["KeyD", "KeyS"]);
});

test("fast fall accelerates downward without slowing an existing fall", () => {
  const normal = nextVerticalVelocity(40, 0.1, 560, false);
  const fast = nextVerticalVelocity(40, 0.1, 560, true);
  assert.ok(fast > normal);
  assert.equal(nextVerticalVelocity(470, 1, 560, true), FAST_FALL_SPEED);
  assert.equal(nextVerticalVelocity(430, 0.1, 560, false), 430);
});
