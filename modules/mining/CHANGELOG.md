# Changelog

## 0.1.0 — Mining V1
- Added deterministic `findBlocks`, `mineBlock`, `mineNearest`, `mineVein` and `collectDrop`.
- Added `ToolSelector` using harvestability before tier/tool heuristics.
- Added target revalidation after navigation and post-dig verification.
- Added bounded 6-neighbor vein discovery with hard cap.
- Added Mineflayer 26.2 adapter.
- Added explicit Navigation V1.1 adapter for `goToBlock`, `goToEntity` and `isReachable`.
- Made `reachableOnly` a query-only operation with no movement side effect.
- Added AbortSignal-aware orchestration and pickup deadline.
- Added unit tests, validation notes and CI.
