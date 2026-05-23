import { handleApi } from '../server/app.js';

export default async function handler(req, res) {
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  if (!url.pathname.startsWith('/api/') || url.pathname.includes('[...path]')) {
    const path = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path;
    if (path) url.pathname = `/api/${path}`;
  }
  await handleApi(req, res, url);
}
