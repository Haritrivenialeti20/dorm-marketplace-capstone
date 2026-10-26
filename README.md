# Dorm Marketplace

A focused, in-memory campus marketplace prototype for Project-Engineering Challenge 10. The product supports the minimum useful workflow: publish a listing, browse items, reserve one item, and resolve the handoff.

## Run locally

```bash
npm start
# open http://localhost:4173
```

Run the automated checks with:

```bash
npm test
npm run check
```

## Engineering decisions

- **No database:** the challenge explicitly allows in-memory state. This keeps the capstone inspectable and makes resettable demo data easy.
- **Atomic claim transition:** the server performs the `available` to `reserved` transition synchronously in one event-loop turn. A second claim cannot observe the item as available after the first transition, so only one claimant wins.
- **Expiration on read:** stale reservations are released whenever items are read or mutated. This avoids a timer per listing while guaranteeing that a ghost buyer does not lock inventory indefinitely.
- **Seller override:** `Mark sold` and `Remove listing` are available from the listing state so an off-platform hallway sale can be reflected immediately.
- **No secret or payment handling:** there are no API keys, payment credentials, or external services in this MVP.

See [PRD.md](./PRD.md) for the three scope cuts, three MVP features, and Given/When/Then acceptance criteria.
