# Navigation — Minecraft Java 26.2 deterministic bot skills

Segundo módulo do projeto. O `Navigation` decide **por onde ir**; o `Movement V2` continua responsável por executar fisicamente cada trecho.

## Skills

- `findPath`
- `followPath`
- `goToPosition`
- `goToBlock`
- `goToEntity`
- `replanPath`
- `findSafeRoute`
- `findNearestReachable`
- `isReachable`
- `estimatePathCost`
- `escapeDanger`
- `returnHome`

## O que existe de verdade

- A* 3D com heap binário.
- Nós com modos `ground`, `swimming`, `climbing` e `airborne`.
- Alturas fracionárias para slabs/stairs e superfícies parciais.
- Validação do corpo usando AABB de aproximadamente 0,6 x 1,8 contra `Block.shapes`.
- Geração de vizinhos para walk, diagonal, step up/down, safe drop, swim e climb.
- Bloqueio de diagonal quando os cantos não comportam o corpo.
- Modelo de custo por terreno/ação.
- Penalidade por hazard e por proximidade de lava/perigos.
- Mundo desconhecido/chunk não carregado tratado como `UNKNOWN`, nunca como ar.
- Cache de blocos limitado e invalidado quando a revisão do mundo muda.
- Path optimizer conservador para trechos retos.
- Path validator antes da execução.
- Replanning quando Movement falha ou um waypoint fica inválido.
- Alvo dinâmico em `goToEntity` com replanejamento em chunks de rota.
- `NavigationLock` com prioridade e preemption segura para `escapeDanger`.
- AbortSignal, timeout, limites de expansão e yield periódico do A*.

## Relação com Movement V2

O Navigation não usa `bot.setControlState()`.

Ele executa waypoints através de uma interface compatível com o Movement V2:

```text
A* / Path Planner
      ↓
Waypoints
      ↓
PathExecutor
      ↓
Movement V2
  moveTo / stepUp / safeDrop / climb / swim
```

## Exemplo de API

```ts
const navigation = createNavigation({
  bot,
  movement,
  home: new Vec3(0, 64, 0)
})

await navigation.goToPosition({
  x: 100,
  y: 64,
  z: -20,
  replan: true
})

const path = await navigation.findPath({
  target: new Vec3(150, 70, 40),
  avoidHazards: true
})
```

## Instalação

```bash
cd modules/navigation
npm install
npm test
npm run build
```

Node.js 22+.

## Limites intencionais desta versão

O módulo **não** quebra nem coloca blocos, não constrói pontes/pilares, não faz parkour extremo, não controla elytra/barcos/minecarts e não abre portas sozinho. Portas que exigem interação podem ser identificadas como `requiresInteraction`; a execução deve ser integrada ao futuro módulo `Interaction`.

Esses limites são intencionais para manter a separação entre Navigation, Movement, Mining, Building e Interaction.
