import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateModel } from '../engine/src/index.js';

const filename = process.argv[2];
if (!filename) { console.error('Usage: node tools/validate-model.mjs models/<model>/model.json'); process.exit(2); }
const path = resolve(filename);
const model = JSON.parse(await readFile(path, 'utf8'));
const result = validateModel(model);
if (!result.valid) { console.error(`Invalid Histomap model: ${path}`); result.errors.forEach(({ path: errorPath, message }) => console.error(`- ${errorPath}: ${message}`)); process.exit(1); }
console.log(`Valid Histomap model: ${model.metadata.title} (${model.metadata.id})`);
