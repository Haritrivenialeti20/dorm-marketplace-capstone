const test = require('node:test');
const assert = require('node:assert/strict');
const marketplace = require('../server');

function item(id = 'item-1') { return marketplace.state.items.get(id); }

test.beforeEach(() => marketplace.seed());

test('only the first claim wins a collision', () => {
  const first = marketplace.claimItem('item-1', 'Ari');
  const second = marketplace.claimItem('item-1', 'Sam');
  assert.equal(first.item.status, 'reserved');
  assert.equal(first.item.claim.buyer, 'Ari');
  assert.equal(second.statusCode, 409);
  assert.equal(item().claim.buyer, 'Ari');
});

test('an unconfirmed reservation expires and becomes available', () => {
  const result = marketplace.claimItem('item-1', 'Ari');
  result.item.claim.expiresAt = Date.now() - 1;
  assert.equal(marketplace.snapshot().find((entry) => entry.id === 'item-1').status, 'available');
  assert.equal(item().claim, null);
});

test('a confirmed handoff changes the item to claimed', () => {
  marketplace.claimItem('item-1', 'Ari');
  const result = marketplace.confirmHandoff('item-1', 'Ari');
  assert.equal(result.item.status, 'claimed');
});

test('seller can mark an active claim sold elsewhere', () => {
  marketplace.claimItem('item-1', 'Ari');
  const result = marketplace.markSold('item-1');
  assert.equal(result.item.status, 'sold');
  assert.equal(result.item.claim, null);
});

test('seller can remove a listing immediately', () => {
  const result = marketplace.forceRemove('item-2');
  assert.equal(result.item.id, 'item-2');
  assert.equal(marketplace.state.items.has('item-2'), false);
});

test('new listings validate required fields', () => {
  assert.throws(() => marketplace.createItem({ title: 'Lamp' }), /required/);
  const created = marketplace.createItem({ title: 'Chair', description: 'Solid', price: 5, seller: 'Ari', dorm: 'West Hall' });
  assert.equal(created.status, 'available');
});
