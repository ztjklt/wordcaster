import assert from "node:assert/strict";
import test from "node:test";

import { BrowserWordRecognizer } from "../incantation-voice-kit/src/recognizer.ts";

test("normal hold release commits a final transcript while cancel discards it", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const finals: string[] = [];
  let current: FakeRecognition | undefined;
  let aborts = 0;

  class FakeRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart: (() => void) | null = null;
    onresult: ((event: unknown) => void) | null = null;
    onerror = null;
    onend: (() => void) | null = null;

    constructor() {
      // The test keeps the browser-created instance so it can assert cancellation.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      current = this;
    }

    start(): void {
      this.onstart?.();
    }

    stop(): void {
      this.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            length: 1,
            isFinal: true,
            0: { transcript: "Build a stonewall", confidence: 0.92 },
          },
        },
      });
      this.onend?.();
    }

    abort(): void {
      aborts += 1;
      this.onend?.();
    }
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
    const recognizer = new BrowserWordRecognizer("en-US", false, {
      onPartial() {},
      onFinal(result) {
        finals.push(result.transcript);
      },
      onFailure() {},
      onState() {},
    });
    assert.equal(recognizer.start(), true);
    assert.ok(current);
    recognizer.finish();
    assert.deepEqual(finals, ["Build a stonewall"]);

    assert.equal(recognizer.start(), true);
    recognizer.cancel();
    assert.equal(aborts, 1);
    assert.deepEqual(finals, ["Build a stonewall"]);
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  }
});
