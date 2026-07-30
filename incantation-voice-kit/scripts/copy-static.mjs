import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceAudio = fileURLToPath(new URL('../src/assets/audio/', import.meta.url));
const outputAudio = fileURLToPath(new URL('../dist/assets/audio/', import.meta.url));
const sourceLicense = fileURLToPath(new URL('../LICENSE-KENNEY.txt', import.meta.url));
const outputLicense = fileURLToPath(new URL('../dist/LICENSE-KENNEY.txt', import.meta.url));

await mkdir(outputAudio, { recursive: true });
await cp(sourceAudio, outputAudio, { recursive: true });
await cp(sourceLicense, outputLicense);

process.stdout.write(`Copied distributable audio assets for ${packageRoot}\n`);
