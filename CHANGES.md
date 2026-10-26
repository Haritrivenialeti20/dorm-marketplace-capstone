# Changes

## Challenge 10 — Dorm Marketplace

- Added a greenfield vanilla JavaScript marketplace UI and Node HTTP server.
- Added `PRD.md` with exactly three scope cuts, three MVP features, and three Claim Item acceptance criteria.
- Added in-memory item lifecycle states: available, reserved, claimed, sold.
- Added atomic collision protection so only one concurrent claimant succeeds.
- Added a 30-second ghost-buyer expiration rule with UI countdown.
- Added seller-side Mark Sold and Remove Listing overrides.
- Added automated Node tests for the required scenarios and validation rules.
