const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 4173);
const CLAIM_TTL_MS = 30_000;
const publicDir = path.join(__dirname, 'public');

const state = { items: new Map(), nextId: 4 };

function seed() {
  state.items.clear();
  state.nextId = 4;
  [
    { id: 'item-1', title: 'Calculus I Textbook', description: 'Clean, highlighted in a few chapters.', price: 15, seller: 'Maya Chen', dorm: 'North Hall' },
    { id: 'item-2', title: 'Mini Fridge', description: 'Works well and fits under a standard desk.', price: 35, seller: 'Jordan Ellis', dorm: 'Maple House' },
    { id: 'item-3', title: 'Desk Lamp', description: 'Warm LED lamp with a flexible neck.', price: 0, seller: 'Priya Shah', dorm: 'Oak Hall' }
  ].forEach((item) => state.items.set(item.id, { ...item, status: 'available', claim: null, updatedAt: Date.now() }));
}
seed();

function expireStaleClaims() {
  const now = Date.now();
  for (const item of state.items.values()) {
    if (item.status === 'reserved' && item.claim && item.claim.expiresAt <= now) {
      item.status = 'available';
      item.claim = null;
      item.updatedAt = now;
    }
  }
}

function snapshot() {
  expireStaleClaims();
  return [...state.items.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function findItem(id) {
  expireStaleClaims();
  return state.items.get(id);
}

function createItem(input) {
  const title = String(input.title || '').trim();
  const seller = String(input.seller || '').trim();
  const dorm = String(input.dorm || '').trim();
  const description = String(input.description || '').trim();
  const price = Number(input.price);
  if (!title || !seller || !dorm || !description || !Number.isFinite(price) || price < 0) {
    const error = new Error('Title, description, seller, dorm, and a non-negative price are required.');
    error.statusCode = 400;
    throw error;
  }
  const item = { id: `item-${state.nextId++}`, title, description, price, seller, dorm, status: 'available', claim: null, updatedAt: Date.now() };
  state.items.set(item.id, item);
  return item;
}

function claimItem(id, buyer) {
  const item = findItem(id);
  const name = String(buyer || '').trim();
  if (!item) return { statusCode: 404, error: 'Listing not found.' };
  if (!name) return { statusCode: 400, error: 'Buyer name is required.' };
  // This synchronous state transition is the collision guard: the first request
  // changes available -> reserved before another request can observe availability.
  if (item.status !== 'available') return { statusCode: 409, error: 'This item is no longer available.', item };
  const now = Date.now();
  item.status = 'reserved';
  item.claim = { buyer: name, claimedAt: now, expiresAt: now + CLAIM_TTL_MS };
  item.updatedAt = now;
  return { item };
}

function confirmHandoff(id, buyer) {
  const item = findItem(id);
  if (!item) return { statusCode: 404, error: 'Listing not found.' };
  if (item.status !== 'reserved' || item.claim.buyer !== String(buyer || '').trim()) return { statusCode: 409, error: 'Only the active buyer can confirm this handoff.', item };
  item.status = 'claimed';
  item.claim.confirmedAt = Date.now();
  item.updatedAt = Date.now();
  return { item };
}

function markSold(id) {
  const item = findItem(id);
  if (!item) return { statusCode: 404, error: 'Listing not found.' };
  item.status = 'sold';
  item.claim = null;
  item.updatedAt = Date.now();
  return { item };
}

function forceRemove(id) {
  const item = findItem(id);
  if (!item) return { statusCode: 404, error: 'Listing not found.' };
  state.items.delete(id);
  return { item };
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  const requested = new URL(req.url, `http://${req.headers.host}`).pathname;
  const file = requested === '/' ? 'index.html' : requested.replace(/^\//, '');
  const filePath = path.normalize(path.join(publicDir, file));
  if (!filePath.startsWith(publicDir)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (error, data) => {
    if (error) return json(res, 404, { error: 'Not found' });
    const type = filePath.endsWith('.html') ? 'text/html' : filePath.endsWith('.css') ? 'text/css' : 'application/javascript';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 100_000) reject(new Error('Request too large.')); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON.')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/items') return json(res, 200, { items: snapshot(), claimTtlMs: CLAIM_TTL_MS });
  if (req.method === 'POST' && url.pathname === '/api/items') {
    try { return json(res, 201, { item: createItem(await readBody(req)) }); } catch (error) { return json(res, error.statusCode || 400, { error: error.message }); }
  }
  const match = url.pathname.match(/^\/api\/items\/([^/]+)\/(claim|confirm|sold|remove)$/);
  if (req.method === 'POST' && match) {
    try {
      const input = await readBody(req);
      const action = match[2];
      const result = action === 'claim' ? claimItem(match[1], input.buyer) : action === 'confirm' ? confirmHandoff(match[1], input.buyer) : action === 'sold' ? markSold(match[1]) : forceRemove(match[1]);
      return json(res, result.statusCode || 200, result.error ? { error: result.error, item: result.item } : { item: result.item });
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/reset') { seed(); return json(res, 200, { items: snapshot() }); }
  if (req.method === 'GET') return serveStatic(req, res);
  return json(res, 404, { error: 'Not found' });
});

if (require.main === module) server.listen(PORT, () => console.log(`Dorm Marketplace running at http://localhost:${PORT}`));
module.exports = { state, seed, snapshot, claimItem, confirmHandoff, markSold, forceRemove, createItem, CLAIM_TTL_MS, server };
