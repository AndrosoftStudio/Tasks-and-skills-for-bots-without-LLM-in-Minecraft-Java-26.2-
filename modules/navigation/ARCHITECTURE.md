# Navigation Architecture

```text
Navigation API
     ↓
Navigation Skills
     ↓
NavigationService
     ├── NavigationLock
     ├── AStarPlanner
     │    ├── PriorityQueue
     │    ├── NeighborGenerator
     │    ├── NavigationCostModel
     │    └── MinecraftHeuristic
     ├── WalkabilityAnalyzer
     │    └── NavigationWorld / block collision shapes
     ├── PathValidator
     ├── PathOptimizer
     └── PathExecutor
              ↓
          Movement V2
```

## World model

`NavigationWorld` abstrai Mineflayer. O adapter `MineflayerNavigationWorld` converte `bot.blockAt()` em dados mínimos de navegação. `CachedNavigationWorld` reduz leituras repetidas e invalida o cache quando a revisão muda por `blockUpdate`, `chunkColumnLoad` ou `chunkColumnUnload`.

## Espaço do jogador

Nós usam `(x, y, z, locomotionMode)`, onde `y` pode ser fracionário. A validade não considera o jogador como ponto: `WalkabilityAnalyzer` testa o AABB corporal contra collision shapes reais dos blocos. Isso permite distinguir full blocks, slabs, stairs e colisões laterais.

## A*

Open set usa heap binário. `gScore`, `cameFrom` e `closed` são maps/sets por `nodeKey`. O planner respeita `maxExpandedNodes`, `maxDistance`, timeout e `AbortSignal`; a cada 512 expansões cede o event loop.

## Replanning

`goToPosition`, `goToBlock` e rotas compostas podem replanejar depois de `PATH_BLOCKED` ou `MOVEMENT_FAILED`. `goToEntity` executa partes da rota, revisa a posição do alvo e replaneja quando ele se desloca além do limiar.

## Segurança

`findSafeRoute` usa perfil de custo seguro. Lava/hazards podem tornar posições inválidas e perigos próximos aumentam o custo, permitindo preferir uma rota mais longa e segura.

## Concorrência

`NavigationLock` aceita `normal`, `high` e `emergency`. Preemption aborta o dono antigo e aguarda a liberação antes de entregar o lease ao próximo dono.
