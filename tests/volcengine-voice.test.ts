import assert from "node:assert/strict";
import test from "node:test";

import {
  createArkRecognizer,
  encodePcm16Wav,
} from "../app/game/arkRecognizer.ts";
import { createDefaultRecognizer } from "../incantation-voice-kit/src/recognizer.ts";
import {
  handleArkTranscription,
} from "../worker/ark-transcription.ts";

test("Douyin bridge records AAC and sends it to the confirmed Ark audio model", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let onStart: (() => void) | undefined;
  let onStop: ((result: { tempFilePath?: string }) => void) | undefined;
  let onError: ((error: { errMsg?: string }) => void) | undefined;
  let requestedModel = "";
  let requestedPath = "";
  const finalTranscripts: string[] = [];

  const recorder = {
    onStart(callback: () => void) {
      onStart = callback;
    },
    onStop(callback: (result: { tempFilePath?: string }) => void) {
      onStop = callback;
    },
    onError(callback: (error: { errMsg?: string }) => void) {
      onError = callback;
    },
    start(options: { format: "aac" }) {
      assert.equal(options.format, "aac");
      onStart?.();
    },
    stop() {
      onStop?.({ tempFilePath: "tt://recording/incantation.aac" });
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout,
      clearTimeout,
      tt: {
        getRecorderManager: () => recorder,
        callAIChatCompletion(options: {
          model: string;
          messages: Array<{
            content: Array<{
              input_audio?: { path: string };
            }>;
          }>;
          success?: (result: { data?: string }) => void;
          complete?: () => void;
        }) {
          requestedModel = options.model;
          requestedPath =
            options.messages[0]?.content[1]?.input_audio?.path ?? "";
          options.success?.({ data: '"Build a stone wall"' });
          options.complete?.();
        },
      },
    },
  });

  try {
    const recognizer = createDefaultRecognizer("en-US", false, {
      onPartial() {},
      onFinal(result) {
        finalTranscripts.push(result.transcript);
      },
      onFailure() {},
      onState() {},
    });
    assert.equal(recognizer.provider, "volcengine");
    assert.equal(recognizer.start(), true);
    recognizer.finish();
    assert.equal(requestedModel, "doubao-seed-2-0-lite-260428");
    assert.equal(requestedPath, "tt://recording/incantation.aac");
    assert.deepEqual(finalTranscripts, ["Build a stone wall"]);
    assert.equal(typeof onError, "function");
    recognizer.destroy();
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  }
});

test("browser microphone permission watchdog exits the pending state", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  let permissionTimeout: (() => void) | undefined;
  const failures: Array<{ reason: string; fatal: boolean }> = [];
  const states: string[] = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: class FakeAudioContext {},
      setTimeout(callback: () => void) {
        permissionTimeout = callback;
        return 1;
      },
      clearTimeout() {},
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => new Promise<MediaStream>(() => {}),
      },
    },
  });

  try {
    const recognizer = createArkRecognizer("en-US", false, {
      onPartial() {},
      onFinal() {},
      onFailure(reason, _message, fatal) {
        failures.push({ reason, fatal });
      },
      onState(state) {
        states.push(state);
      },
    });
    assert.equal(recognizer.start(), true);
    assert.equal(recognizer.requestingPermission, true);
    permissionTimeout?.();
    assert.equal(recognizer.requestingPermission, false);
    assert.equal(recognizer.listening, false);
    assert.deepEqual(failures, [{ reason: "permission", fatal: true }]);
    assert.equal(states.at(-1), "fallback");
    recognizer.destroy();
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
});

test("Douyin recognizer rejects duplicate holds and recovers after Ark timeout", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let onStart: (() => void) | undefined;
  let onStop: ((result: { tempFilePath?: string }) => void) | undefined;
  let nextTimerId = 1;
  const timers = new Map<number, () => void>();
  const failures: string[] = [];
  const states: string[] = [];

  const recorder = {
    onStart(callback: () => void) {
      onStart = callback;
    },
    onStop(callback: (result: { tempFilePath?: string }) => void) {
      onStop = callback;
    },
    onError() {},
    start() {
      onStart?.();
    },
    stop() {
      onStop?.({ tempFilePath: "tt://recording/timeout.aac" });
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout(callback: () => void) {
        const id = nextTimerId;
        nextTimerId += 1;
        timers.set(id, callback);
        return id;
      },
      clearTimeout(id: number) {
        timers.delete(id);
      },
      tt: {
        getRecorderManager: () => recorder,
        callAIChatCompletion() {
          // Deliberately leave the request pending so the watchdog settles it.
        },
      },
    },
  });

  try {
    const recognizer = createDefaultRecognizer("en-US", false, {
      onPartial() {},
      onFinal() {},
      onFailure(reason) {
        failures.push(reason);
      },
      onState(state) {
        states.push(state);
      },
    });
    assert.equal(recognizer.start(), true);
    recognizer.finish();
    assert.equal(recognizer.start(), false);
    assert.equal(timers.size, 1);
    timers.values().next().value?.();
    assert.deepEqual(failures, ["network"]);
    assert.equal(states.at(-1), "idle");
    assert.equal(recognizer.start(), true);
    recognizer.cancel();
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  }
});

test("WAV encoder produces 16 kHz mono PCM accepted by the Ark request", () => {
  const input = new Float32Array(48_000);
  for (let index = 0; index < input.length; index += 1) {
    input[index] = Math.sin((index / 48_000) * Math.PI * 2 * 440) * 0.25;
  }
  const wav = encodePcm16Wav([input], 48_000);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(wav.slice(8, 12)), "WAVE");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(wav.byteLength, 44 + 16_000 * 2);
});

test("server proxy keeps the key server-side and returns a cleaned transcript", async () => {
  let upstreamAuthorization = "";
  let upstreamModel = "";
  let upstreamFormat = "";
  const fakeFetch: typeof fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    upstreamAuthorization = headers.get("Authorization") ?? "";
    const body = JSON.parse(String(init?.body)) as {
      model?: string;
      messages?: Array<{
        content?: Array<{
          input_audio?: { format?: string; data?: string };
        }>;
      }>;
    };
    upstreamModel = body.model ?? "";
    upstreamFormat =
      body.messages?.[0]?.content?.[1]?.input_audio?.format ?? "";
    assert.ok(
      (body.messages?.[0]?.content?.[1]?.input_audio?.data?.length ?? 0) > 40,
    );
    return Response.json({
      choices: [{ message: { content: "Transcript: “Raise the gate”" } }],
    });
  };

  const wav = encodePcm16Wav([new Float32Array(4_000).fill(0.2)], 16_000);
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "spell.wav");
  const response = await handleArkTranscription(
    new Request("https://word-caster.test/api/transcribe", {
      method: "POST",
      headers: {
        Origin: "https://word-caster.test",
        "CF-Connecting-IP": "203.0.113.10",
      },
      body: form,
    }),
    {
      ARK_API_KEY: "test-server-secret",
      ARK_AUDIO_MODEL: "doubao-seed-2-0-lite-260428",
    },
    fakeFetch,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { transcript: "Raise the gate" });
  assert.equal(upstreamAuthorization, "Bearer test-server-secret");
  assert.equal(upstreamModel, "doubao-seed-2-0-lite-260428");
  assert.equal(upstreamFormat, "wav");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("server proxy accepts the public origin behind a trusted reverse proxy", async () => {
  const wav = encodePcm16Wav(
    [new Float32Array(4_000).fill(0.2)],
    16_000,
  );
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "spell.wav");
  const response = await handleArkTranscription(
    new Request("http://wordcaster.railway.internal/api/transcribe", {
      method: "POST",
      headers: {
        Origin: "https://wordcaster-production.up.railway.app",
        "X-Forwarded-Host": "wordcaster-production.up.railway.app",
        "X-Forwarded-Proto": "https",
      },
      body: form,
    }),
    { ARK_API_KEY: "test-server-secret" },
    async () => Response.json({
      choices: [{ message: { content: "Archer" } }],
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { transcript: "Archer" });
});

test("server proxy still rejects a mismatched forwarded origin", async () => {
  const response = await handleArkTranscription(
    new Request("http://wordcaster.railway.internal/api/transcribe", {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "X-Forwarded-Host": "wordcaster-production.up.railway.app",
        "X-Forwarded-Proto": "https",
      },
    }),
    { ARK_API_KEY: "test-server-secret" },
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "invalid_origin" });
});

test("server proxy refuses requests when the Ark secret is not configured", async () => {
  const form = new FormData();
  form.append(
    "audio",
    new Blob([new Uint8Array(64)], { type: "audio/wav" }),
    "spell.wav",
  );
  const response = await handleArkTranscription(
    new Request("https://word-caster.test/api/transcribe", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.11" },
      body: form,
    }),
    undefined,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "voice_not_configured" });
});
