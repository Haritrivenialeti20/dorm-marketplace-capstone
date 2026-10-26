const itemsEl = document.querySelector('#items');
const template = document.querySelector('#itemTemplate');
const notice = document.querySelector('#notice');
const countEl = document.querySelector('#availableCount');
let items = [];

const money = (value) => value === 0 ? 'Free' : `$${value}`;
function showNotice(message, isError = false) { notice.textContent = message; notice.className = `notice${isError ? ' error' : ''}`; clearTimeout(showNotice.timer); showNotice.timer = setTimeout(() => { notice.textContent = ''; }, 5000); }
async function api(path, options = {}) { const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data; }

function render() {
  countEl.textContent = items.filter((item) => item.status === 'available').length;
  itemsEl.replaceChildren();
  if (!items.length) { itemsEl.innerHTML = '<div class="panel"><p class="claim-note">No listings yet. Be the first to give an item a second room.</p></div>'; return; }
  for (const item of items) {
    const card = template.content.cloneNode(true);
    card.querySelector('.tag').textContent = item.status;
    card.querySelector('.tag').classList.add(item.status);
    card.querySelector('.price').textContent = money(item.price);
    card.querySelector('.title').textContent = item.title;
    card.querySelector('.description').textContent = item.description;
    card.querySelector('.seller').textContent = `By ${item.seller}`;
    card.querySelector('.dorm').textContent = item.dorm;
    const area = card.querySelector('.claim-area');
    if (item.status === 'available') {
      area.innerHTML = `<form class="claim-form"><input aria-label="Your name" placeholder="Your name" required /><button class="primary">Claim</button></form>`;
      area.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); try { await api(`/api/items/${item.id}/claim`, { method: 'POST', body: JSON.stringify({ buyer: event.target.querySelector('input').value }) }); showNotice(`Reserved ${item.title}. Confirm the handoff when you meet.`); await load(); } catch (error) { showNotice(error.message, true); await load(); } });
    } else if (item.status === 'reserved') {
      const expires = Math.max(0, Math.ceil((item.claim.expiresAt - Date.now()) / 1000));
      area.innerHTML = `<p class="claim-note">Reserved by <strong>${item.claim.buyer}</strong> · <span class="countdown">expires in ${expires}s</span></p><div class="action-row"><button class="secondary confirm">Confirm handoff</button><button class="danger sold">Mark sold</button></div>`;
      area.querySelector('.confirm').addEventListener('click', async () => { try { await api(`/api/items/${item.id}/confirm`, { method: 'POST', body: JSON.stringify({ buyer: item.claim.buyer }) }); showNotice('Handoff confirmed. The listing is now claimed.'); await load(); } catch (error) { showNotice(error.message, true); } });
      area.querySelector('.sold').addEventListener('click', () => override(item.id, 'sold'));
    } else if (item.status === 'claimed') {
      area.innerHTML = `<p class="claim-note">Handoff confirmed with <strong>${item.claim.buyer}</strong>.</p><button class="danger sold">Mark sold elsewhere</button>`;
      area.querySelector('.sold').addEventListener('click', () => override(item.id, 'sold'));
    } else {
      area.innerHTML = `<div class="action-row"><span class="claim-note">${item.status === 'sold' ? 'Sold or unavailable.' : 'Removed.'}</span><button class="danger remove">Remove listing</button></div>`;
      area.querySelector('.remove').addEventListener('click', () => override(item.id, 'remove'));
    }
    itemsEl.append(card);
  }
}
async function override(id, action) { try { await api(`/api/items/${id}/${action}`, { method: 'POST', body: '{}' }); showNotice(action === 'remove' ? 'Listing removed immediately.' : 'Listing marked sold.'); await load(); } catch (error) { showNotice(error.message, true); } }
async function load() { const data = await api('/api/items'); items = data.items; render(); }

document.querySelector('#listingForm').addEventListener('submit', async (event) => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.target)); body.price = Number(body.price); try { await api('/api/items', { method: 'POST', body: JSON.stringify(body) }); event.target.reset(); event.target.price.value = 0; showNotice('Listing published to campus.'); await load(); } catch (error) { showNotice(error.message, true); } });
document.querySelector('#resetBtn').addEventListener('click', async () => { await api('/api/reset', { method: 'POST' }); showNotice('Demo data reset.'); await load(); });
document.querySelector('#refreshBtn').addEventListener('click', load);
load();
setInterval(load, 1000);
