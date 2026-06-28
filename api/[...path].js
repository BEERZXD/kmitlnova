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
    // Read request body for write methods (POST, PUT, etc.)
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = chunks.length ? Buffer.concat(chunks) : undefined;
    }

    // Clean and prepare request headers for forwarding
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      // Skip hop-by-hop headers, content-length, and compression headers
      if ([
        'host', 'connection', 'keep-alive', 'transfer-encoding', 
        'content-length', 'accept-encoding', 'content-encoding'
      ].includes(lowerKey)) {
        continue;
      }
      headers[lowerKey] = value;
    }

    // Set target host and appropriate content-length
    headers['host'] = new URL(privateApiUrl).host;
    if (body) {
      headers['content-length'] = String(body.length);
    }

    // Call the private scraper API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    // Copy response headers back to client (skipping response size/encoding headers)
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (![
        'transfer-encoding', 'connection', 'content-encoding', 
        'content-length', 'keep-alive'
      ].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    }

    res.status(response.status);
    
    // Read response as arrayBuffer and send using native res.end()
    const resBuffer = Buffer.from(await response.arrayBuffer());
    res.end(resBuffer);
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
