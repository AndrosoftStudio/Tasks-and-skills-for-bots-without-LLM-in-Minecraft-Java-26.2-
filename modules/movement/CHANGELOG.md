# Changelog

## 0.2.0 — Movement V2

- percepção de corredor corporal com três lanes;
- leitura de `Block.shapes` para colisões parciais;
- `TerrainAnalyzer` com fluids, climbables, hazards e drop analysis;
- `LocalObstacleSolver` com comparação esquerda/direita;
- `LocalMovementEngine` compartilhado por `moveTo` e `followPlayer`;
- modos `ground`, `airborne`, `falling`, `swimming`, `climbing`;
- novas skills `stepUp`, `safeDrop`, `climb`, `swim`;
- `StuckDetector` classifica `no_motion`, `no_progress`, `oscillating`, `falling`;
- `RecoveryPlanner` baseado na causa e percepção atual;
- `TargetTracker` com last-known-position e reacquisition;
- `followPlayer` tolera perda temporária do alvo;
- handoff seguro no `MovementLock`;
- `stop()` aguarda release do movimento cancelado;
- 22 testes unitários passando na validação local.
