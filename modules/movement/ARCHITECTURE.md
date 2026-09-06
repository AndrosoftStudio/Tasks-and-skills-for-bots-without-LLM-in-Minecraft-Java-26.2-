# Arquitetura — Movement V2

```text
Planner / FSM / Behavior Tree
           |
       Navigation (futuro)
           |
      Movement Skills V2
           |
   +-------+---------+
   |                 |
SkillRunner      TargetTracker
   |                 |
   +------ LocalMovementEngine
                 |
        +--------+---------+
        |                  |
  TerrainAnalyzer      SpatialProbe
                           |
                   LocalObstacleSolver
                           |
                    RecoveryPlanner
                           |
                  MovementController
                           |
                     MovementLock
                           |
                      Mineflayer
```

## Responsabilidades

### TerrainAnalyzer
Classifica terreno, fluidos, climbables, hazards e analisa superfícies/queda.

### SpatialProbe
Mede um corredor local com múltiplas lanes corporais e usa collision shapes do bloco.

### LocalObstacleSolver
Compara headings laterais e escolhe uma reação local segura. Não é pathfinder global.

### LocalMovementEngine
Traduz objetivo local + modo de locomoção + percepção em controles; é compartilhado por `moveTo` e `followPlayer`.

### StuckDetector
Classifica `no_motion`, `no_progress`, `oscillating` e `falling` usando uma janela temporal.

### RecoveryPlanner
Escolhe recovery de acordo com causa + terreno, em vez de uma sequência fixa cega.

### TargetTracker
Mantém last-known-position e estado de perda/reacquisition do alvo dinâmico.

### MovementLock
Garante ownership exclusivo. Preemption só conclui depois do owner anterior liberar a lease.

### MovementController
Único ponto do módulo que altera control states do Mineflayer.

## Primitives

```text
moveTo
followPlayer
stop
jump
sprint
lookAt
avoidObstacle
stepUp
safeDrop
climb
swim
```

## Separação Movement x Navigation

Movement responde:

> “Consigo executar com segurança este trecho local?”

Navigation responderá:

> “Quais trechos locais formam uma rota até o objetivo?”

Por isso a V2 ganha percepção e obstacle avoidance local, mas não A*.
