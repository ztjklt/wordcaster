import assert from "node:assert/strict";
import test from "node:test";

import { PushToTalkController, type VoiceSnapshot } from "../app/game/voice.ts";

test("first push requests permission without starting recognition or pausing the flow", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const snapshots: VoiceSnapshot[] = [];
  let recognitionStarts = 0;
  let stoppedTracks = 0;

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
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        async getUserMedia() {
          return {
            getTracks: () => [
              {
                stop() {
                  stoppedTracks += 1;
                },
              },
            ],
          };
        },
      },
    },
  });

  try {
    const controller = new PushToTalkController(
      (snapshot) => snapshots.push(snapshot),
      () => {},
    );
    assert.equal(controller.startOnKeyDown(), true);
    assert.equal(controller.isRequestingPermission(), true);
    assert.equal(recognitionStarts, 0);

    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(controller.isRequestingPermission(), false);
    assert.equal(recognitionStarts, 0);
    assert.equal(stoppedTracks, 1);
    assert.match(snapshots.at(-1)?.message ?? "", /再次按住 M/);

    assert.equal(controller.startOnKeyDown(), true);
    assert.equal(recognitionStarts, 1);
    assert.equal(snapshots.at(-1)?.state, "listening");
    controller.cancel();
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    }
  }
});
