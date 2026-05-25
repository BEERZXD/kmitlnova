import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestListener } from './app.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 8787);
const hostArgIndex = process.argv.indexOf('--host');
const host = hostArgIndex >= 0 ? process.argv[hostArgIndex + 1] : process.env.HOST ?? '127.0.0.1';

createServer(requestListener).listen(port, host, async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  console.log(`${pkg.name} backend listening on http://${host}:${port}`);
});
