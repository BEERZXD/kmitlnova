import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestListener } from './app.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 8787);

createServer(requestListener).listen(port, '127.0.0.1', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  console.log(`${pkg.name} backend listening on http://127.0.0.1:${port}`);
});
