import assert from "node:assert/strict";
import test from "node:test";

import { PushToTalkController, type VoiceSnapshot } from "../app/game/voice.ts";

test("first push starts recognition without using the blocked mediaDevices API", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const snapshots: VoiceSnapshot[] = [];
  let recognitionStarts = 0;

  class FakeRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart: (() => void) | null = null;
    onresult = null;
    onerror = null;
    onend: (() => void) | null = null;

    start(): void {
      recognitionStarts += 1;
      this.onstart?.();
    }

    stop(): void {
      this.onend?.();
    }

    abort(): void {}
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      SpeechRecognition: FakeRecognition,
      setTimeout,
      clearTimeout,
    },
  });
  try {
    const controller = new PushToTalkController(
      (snapshot) => snapshots.push(snapshot),
      () => {},
    );
    assert.equal(controller.startOnKeyDown(), true);
    assert.equal(controller.isRequestingPermission(), false);
    assert.equal(recognitionStarts, 1);
    assert.equal(snapshots.at(-1)?.state, "listening");
    controller.cancel();
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  }
});
