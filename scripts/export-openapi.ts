import { writeFileSync } from 'node:fs';
import { openApiDocument } from '../src/openapi/document.js';

writeFileSync('openapi.json', `${JSON.stringify(openApiDocument, null, 2)}\n`);
console.log('openapi.json atualizado');
