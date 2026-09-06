import { apiMiddleware } from '../backend/api.js';

// Vercel can parse request.body before invoking a Node function. The shared
// middleware accepts both that form and the raw stream used by our local server.
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = url.searchParams.get('route');
  if (route) {
    if (!['translate', 'word', 'word/context', 'sentence/context'].includes(route)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Không tìm thấy.' }));
    }
    url.searchParams.delete('route');
    req.url = `/api/${route}${url.search}`;
  }
  return apiMiddleware(req, res, () => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Không tìm thấy.' }));
  });
}
