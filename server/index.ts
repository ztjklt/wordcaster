import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.API_PORT ?? 8787);
const apiKey = process.env.OPENAI_API_KEY?.trim();
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()));
const hits = new Map<string, { count: number; resetAt: number }>();
const intents = ['SUMMON_EQUIPMENT','MOVE_OBJECT','THROW_OBJECT','OPEN_OBJECT','TURN_LIGHT_OFF','CAST_SKILL','SUMMON_WRONG_ITEM','USE_OBJECT','UNKNOWN'] as const;
const items = [
  'shield','sword','chair','bottle','box','cabinet','light','help','heal','push',
  'ship','dictionary','bed','heel','eyes','desert','lantern','bell','gate','charm',
  'bamboo','leaf','umbrella','bridge','noodles','coin','basket','cup','plate',
  'spoon','pan','kettle','fridge','apple','table','book','lamp','computer','phone',
  'clock','window','desk','ticket','train','door','seat','bag','map',
] as const;
const targets = ['player','enemy', ...items] as const;
const directions = ['left','right','up','down'] as const;
const mistakeTypes = ['confusable','grammar','missing_slot'] as const;
const interpretationKeys = new Set(['utteranceId','naturalText','intent','itemId','targetEntityId','direction','confidence','detectedMistake','explanationZh']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAllowed(value: unknown, values: readonly string[]): value is string {
  return typeof value === 'string' && values.includes(value);
}

function validateModelInterpretation(value: unknown, expectedId: string): Record<string, unknown> | undefined {
  if (!isRecord(value) || Object.keys(value).some((key) => !interpretationKeys.has(key))) return;
  if (value.utteranceId !== expectedId || typeof value.naturalText !== 'string' || value.naturalText.length > 300) return;
  if (!isAllowed(value.intent, intents) || typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) return;
  if (value.itemId !== null && !isAllowed(value.itemId, items)) return;
  if (value.targetEntityId !== null && !isAllowed(value.targetEntityId, targets)) return;
  if (value.direction !== null && !isAllowed(value.direction, directions)) return;
  if (value.explanationZh !== null && (typeof value.explanationZh !== 'string' || value.explanationZh.length > 500)) return;
  if (value.detectedMistake !== null) {
    if (!isRecord(value.detectedMistake) || Object.keys(value.detectedMistake).some((key) => !['targetWord','spokenWord','type'].includes(key))) return;
    if (typeof value.detectedMistake.targetWord !== 'string' || typeof value.detectedMistake.spokenWord !== 'string' || !isAllowed(value.detectedMistake.type, mistakeTypes)) return;
  }
  if (value.intent === 'USE_OBJECT' && !isAllowed(value.itemId, items)) return;
  return value;
}

app.disable('x-powered-by');
app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); } }));
app.use((req, res, next) => {
  const now = Date.now(); const key = req.ip ?? 'unknown'; const previous = hits.get(key);
  const current = !previous || previous.resetAt < now ? { count: 0, resetAt: now + 60_000 } : previous;
  current.count += 1; hits.set(key, current);
  if (current.count > 90) { res.status(429).json({ error: 'rate_limited' }); return; }
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true, realtimeAvailable: Boolean(apiKey), interpretationAvailable: Boolean(apiKey) }));

app.post('/api/realtime/session', express.text({ type: ['application/sdp', 'text/plain'], limit: '64kb' }), async (req, res) => {
  if (!apiKey) { res.status(503).json({ error: 'realtime_not_configured' }); return; }
  if (typeof req.body !== 'string' || !req.body.startsWith('v=')) { res.status(400).json({ error: 'invalid_sdp' }); return; }
  try {
    const form = new FormData(); form.set('sdp', req.body);
    form.set('session', JSON.stringify({ type: 'transcription', audio: { input: { transcription: { model: 'gpt-realtime-whisper', language: 'en', delay: 'low' }, turn_detection: null } } }));
    const upstream = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    res.status(upstream.status).type(upstream.headers.get('content-type') ?? 'application/sdp').send(await upstream.text());
  } catch { res.status(502).json({ error: 'realtime_upstream_failed' }); }
});

app.post('/api/voice/interpret', express.json({ limit: '8kb' }), async (req, res) => {
  if (!apiKey) { res.status(503).json({ error: 'interpretation_not_configured' }); return; }
  const utteranceId = typeof req.body?.utteranceId === 'string' ? req.body.utteranceId.slice(0, 80) : '';
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 300) : '';
  if (!utteranceId || !text) { res.status(400).json({ error: 'invalid_request' }); return; }
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['utteranceId','naturalText','intent','itemId','targetEntityId','direction','confidence','detectedMistake','explanationZh'],
    properties: {
      utteranceId: { type: 'string', maxLength: 80 },
      naturalText: { type: 'string', maxLength: 300 },
      intent: { type: 'string', enum: intents },
      itemId: { anyOf: [{ type: 'string', enum: items }, { type: 'null' }] },
      targetEntityId: { anyOf: [{ type: 'string', enum: targets }, { type: 'null' }] },
      direction: { anyOf: [{ type: 'string', enum: directions }, { type: 'null' }] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      detectedMistake: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['targetWord','spokenWord','type'],
            properties: {
              targetWord: { type: 'string' },
              spokenWord: { type: 'string' },
              type: { type: 'string', enum: mistakeTypes },
            },
          },
          { type: 'null' },
        ],
      },
      explanationZh: { anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }] },
    },
  };
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_INTENT_MODEL ?? 'gpt-5.4-mini', reasoning: { effort: 'none' }, tools: [], input: [{ role: 'system', content: `Interpret English speech as exactly one allowed game intent: ${intents.join(', ')}. Object and target identifiers must come from the supplied JSON Schema. Keep naturalText concise, never invent unavailable actions, and return the same utteranceId. USE_OBJECT requires a valid itemId; targetEntityId cannot substitute for it.` }, { role: 'user', content: JSON.stringify({ utteranceId, text, context: req.body?.context ?? {} }) }], text: { format: { type: 'json_schema', name: 'voice_interpretation', strict: true, schema } } }) });
    const data = await upstream.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const outputText = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
    if (!upstream.ok || !outputText) { res.status(upstream.status || 502).json({ error: 'interpretation_failed' }); return; }
    const interpretation = validateModelInterpretation(JSON.parse(outputText), utteranceId);
    if (!interpretation) { res.status(502).json({ error: 'invalid_model_output' }); return; }
    res.json(interpretation);
  } catch { res.status(502).json({ error: 'interpretation_upstream_failed' }); }
});

app.listen(port, () => { process.stdout.write(`Voice API listening on http://localhost:${port}\n`); });
