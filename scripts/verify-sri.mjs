import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`${url} returned HTTP ${response.statusCode}`));
        response.resume();
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

const scripts = [...indexHtml.matchAll(/<script\s+[^>]*src="(https:\/\/[^"]+)"[^>]*integrity="(sha(384|512)-[^"]+)"[^>]*><\/script>/g)]
  .map(match => {
    const [algorithm] = match[2].split('-', 1);
    return { url: match[1], integrity: match[2], algorithm };
  });

assert(scripts.length >= 3, 'No external scripts with SRI found.');

for (const script of scripts) {
  const bytes = await fetchText(script.url);
  const expected = `${script.algorithm}-${createHash(script.algorithm).update(bytes).digest('base64')}`;
  assert(expected === script.integrity, `SRI mismatch for ${script.url}\nexpected: ${expected}\nactual:   ${script.integrity}`);
  console.log(`SRI ok: ${script.url}`);
}
