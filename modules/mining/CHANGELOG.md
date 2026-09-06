# Changelog

## 0.1.1 — Mining V1.1
- Added line-of-sight validation before digging.
- Added bounded reposition recovery through Navigation V1.1 `goToPosition`.
- Added `BLOCK_NOT_VISIBLE` typed failure when no visible mining face can be obtained.
- Revalidated target identity during LOS repositioning.
- Changed Mineflayer dig to use `raycast` face selection.
- Added gravity-block-aware post-dig verification to avoid false `DIG_FAILED` when an identical falling block replaces the mined block.
- Changed bare-hand harvestability from magic id `0` to `Block.canHarvest(null)`.
- Documented full-inventory behavior as a known limitation delegated to the future inventory module.
- Expanded automated tests for LOS, repositioning, gravity replacement, non-gravity verification and bare-hand semantics.

## 0.1.0 — Mining V1
- Added deterministic `findBlock`, `findBlocks`, `mineBlock`, `mineNearest`, `mineVein` and `collectDrop`.
- Added explicit skill wrappers for `findBlock`, `mineBlock`, `mineNearest`, `collectDrop` and `mineVein`.
- Added `ToolSelector` using harvestability before tier/tool heuristics.
- Added target revalidation after navigation and post-dig verification.
- Added bounded 6-neighbor vein discovery with hard cap.
- Added Mineflayer 26.2 adapter.
- Added explicit Navigation V1.1 adapter for `goToBlock`, `goToEntity` and `isReachable`.
- Made `reachableOnly` a query-only operation with no movement side effect.
- Added AbortSignal-aware orchestration and pickup deadline.
- Added unit tests, validation notes and CI.
