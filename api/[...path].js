import { Buffer } from 'node:buffer';

export default async function handler(req, res) {
  const privateApiUrl = process.env.PRIVATE_API_URL;
  if (!privateApiUrl) {
    res.status(500).json({ 
      error: { 
        code: 'PROXY_CONFIG_ERROR', 
        message: 'PRIVATE_API_URL environment variable is not configured.' 
      } 
    });
    return;
  }

  // Parse path and query params
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  if (!url.pathname.startsWith('/api/') || url.pathname.includes('[...path]')) {
    const path = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path;
    if (path) url.pathname = `/api/${path}`;
  }

  const targetUrl = new URL(url.pathname + url.search, privateApiUrl).toString();

  try {
    // Read request body for write methods
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = chunks.length ? Buffer.concat(chunks) : undefined;
    }

    // Prepare headers for proxying
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === 'host') {
        headers['host'] = new URL(privateApiUrl).host;
      } else {
        headers[key] = value;
      }
    }

    // Call the private scraper API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    // Copy response headers back to client
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    }

    res.status(response.status);
    
    // Send response bytes
    const resBuffer = Buffer.from(await response.arrayBuffer());
    res.send(resBuffer);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: { 
        code: 'PROXY_CONNECTION_FAILED', 
        message: 'Failed to connect to the private backend API.' 
      } 
    });
  }
}
