import { access, readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const expected = [
  '../dist/incantation-voice-kit.es.js',
  '../dist/incantation-voice-kit.iife.js',
  '../dist/incantation-voice-kit.css',
  '../dist/index.d.ts',
  '../dist/assets/audio/voice-on.ogg',
  '../dist/assets/audio/voice-commit.ogg',
  '../dist/assets/audio/voice-success.ogg',
  '../dist/assets/audio/voice-fail.ogg',
  '../dist/LICENSE-KENNEY.txt',
];

await Promise.all(expected.map((relativePath) =>
  access(fileURLToPath(new URL(relativePath, import.meta.url)))));

const bundlePaths = [
  fileURLToPath(new URL('../dist/incantation-voice-kit.es.js', import.meta.url)),
  fileURLToPath(new URL('../dist/incantation-voice-kit.iife.js', import.meta.url)),
];
const bundle = (await Promise.all(bundlePaths.map((path) => readFile(path, 'utf8')))).join('\n');
const forbidden = ['Phaser', 'SaveManager', '/api/voice/interpret', 'openai-realtime'];
const leaked = forbidden.filter((needle) => bundle.includes(needle));
if (leaked.length) {
  throw new Error(`Standalone bundle contains forbidden project dependencies: ${leaked.join(', ')}`);
}

process.stdout.write('Standalone package verification passed.\n');
