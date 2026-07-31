import { Buffer } from "node:buffer";

const DEFAULT_AUDIO_MODEL = "doubao-seed-2-0-lite-260428";
const ARK_CHAT_URL =
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_REQUESTS_PER_MINUTE = 12;
const RATE_WINDOW_MS = 60_000;

export interface ArkEnvironment {
  ARK_API_KEY?: string;
  ARK_AUDIO_MODEL?: string;
}

interface RateBucket {
  count: number;
  startedAt: number;
}

interface ArkChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; content?: string }>;
    };
  }>;
}

const rateBuckets = new Map<string, RateBucket>();

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function allowedByRateLimit(request: Request): boolean {
  const now = Date.now();
  const client =
    request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
    || "local";
  const current = rateBuckets.get(client);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(client, { count: 1, startedAt: now });
    if (rateBuckets.size > 500) {
      for (const [key, bucket] of rateBuckets) {
        if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
      }
    }
    return true;
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS_PER_MINUTE;
}

function isAudioFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object"
    && value !== null
    && typeof value.arrayBuffer === "function"
    && typeof value.size === "number"
    && typeof value.type === "string"
  );
}

function arkText(payload: ArkChatResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => part.text ?? part.content ?? "")
    .join(" ");
}

export function cleanArkTranscript(value: string): string {
  let transcript = value
    .trim()
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^(?:transcript|transcription)\s*:\s*/i, "");
  const pairedQuotes =
    (transcript.startsWith('"') && transcript.endsWith('"'))
    || (transcript.startsWith("“") && transcript.endsWith("”"))
    || (transcript.startsWith("'") && transcript.endsWith("'"));
  if (pairedQuotes) transcript = transcript.slice(1, -1).trim();
  return transcript.replace(/\s+/g, " ").slice(0, 240);
}

export async function handleArkTranscription(
  request: Request,
  env: ArkEnvironment | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  // Cloudflare supplies Worker bindings through `env`, while vinext's Node
  // production server (used by Railway) exposes them through process.env.
  const apiKey = env?.ARK_API_KEY ?? process.env.ARK_API_KEY;
  const configuredModel =
    env?.ARK_AUDIO_MODEL ?? process.env.ARK_AUDIO_MODEL;

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "method_not_allowed" },
      405,
      { Allow: "POST" },
    );
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== requestUrl.origin) {
    return jsonResponse({ error: "invalid_origin" }, 403);
  }
  if (!allowedByRateLimit(request)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }
  if (!apiKey) {
    return jsonResponse({ error: "voice_not_configured" }, 503);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return jsonResponse({ error: "audio_too_large" }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "invalid_form_data" }, 400);
  }
  const audio = form.get("audio");
  if (!isAudioFile(audio)) {
    return jsonResponse({ error: "missing_audio" }, 400);
  }
  if (
    audio.size <= 44
    || audio.size > MAX_AUDIO_BYTES
    || (audio.type && audio.type !== "audio/wav" && audio.type !== "audio/x-wav")
  ) {
    return jsonResponse({ error: "invalid_audio" }, 400);
  }

  const encodedAudio = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const model = configuredModel?.trim() || DEFAULT_AUDIO_MODEL;
  const arkResponse = await fetchImpl(ARK_CHAT_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0,
      max_tokens: 80,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Perform plain English ASR for this short game command. "
                + "Return only the exact English words spoken. "
                + "Do not explain, translate, label, punctuate, or use markdown. "
                + "If there is no intelligible English speech, return an empty string.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: encodedAudio,
                format: "wav",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!arkResponse.ok) {
    console.error("Ark transcription failed", {
      status: arkResponse.status,
      requestId:
        arkResponse.headers.get("x-request-id")
        || arkResponse.headers.get("x-tt-logid"),
    });
    return jsonResponse(
      {
        error:
          arkResponse.status === 401 || arkResponse.status === 403
            ? "voice_auth_failed"
            : "voice_upstream_failed",
      },
      502,
    );
  }

  let payload: ArkChatResponse;
  try {
    payload = await arkResponse.json() as ArkChatResponse;
  } catch {
    return jsonResponse({ error: "invalid_voice_response" }, 502);
  }
  const transcript = cleanArkTranscript(arkText(payload));
  return jsonResponse({ transcript });
}
