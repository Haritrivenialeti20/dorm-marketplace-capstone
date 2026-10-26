# Dorm Marketplace — Product Requirements Document

## 1. Scope Cut

1. **Payments:** payment processing is scope creep for Day 1 because the MVP only needs a displayed price and an in-person handoff.
2. **Live chat:** real-time messaging is scope creep because students can coordinate a simple pickup after a claim without building a chat system.
3. **Delivery tracking:** shipping and tracking are scope creep because this marketplace is intentionally local and campus-only.

## 2. MVP Features

1. **Create a listing:** a student can publish an item with a title, condition notes, price, seller name, and dorm.
2. **Browse available items:** students can see current listings, price, location, and visible state in one simple catalog.
3. **Claim and resolve a handoff:** one buyer can reserve an item, confirm the handoff, or let the reservation expire so the listing becomes available again; sellers can override the flow by marking an item sold or removing it.

## 3. Acceptance Criteria

### Claim Item — successful reservation

- **Given** an item is available and a student enters their name, **when** they select Claim, **then** the item changes to Reserved and the UI shows the buyer plus an expiration countdown.

### Claim Item — concurrency collision

- **Given** two students attempt to claim the same available item at the same time, **when** the first claim transition is processed, **then** exactly one request succeeds and every later request receives an unavailable response.

### Claim Item — ghost buyer recovery

- **Given** an item is reserved but the buyer does not confirm the handoff before the short timer expires, **when** the marketplace refreshes the item state, **then** the reservation is cleared and the item becomes Available again.
